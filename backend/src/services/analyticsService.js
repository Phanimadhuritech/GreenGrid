const mongoose = require("mongoose");
const Meter = require("../models/Meter");
const MeterReading = require("../models/MeterReading");
const Unit = require("../models/Unit");
const Building = require("../models/Building");
const Organization = require("../models/Organization");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const MaintenanceRequest = require("../models/MaintenanceRequest");

/**
 * Normalizes date bounds for analytics queries
 */
const getDateBounds = (from, to) => {
  const endDate = to ? new Date(to) : new Date();
  let startDate;
  if (from) {
    startDate = new Date(from);
  } else {
    // Default to last 6 months
    startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 6);
  }
  return { startDate, endDate };
};

/**
 * Energy consumption analytics with periodic time-series aggregation
 */
const getEnergyAnalytics = async ({ from, to, organizationId, buildingId, unitId, meterId }) => {
  const { startDate, endDate } = getDateBounds(from, to);

  // Filter units according to hierarchy
  let unitFilter = {};
  if (unitId && mongoose.Types.ObjectId.isValid(unitId)) {
    unitFilter._id = unitId;
  } else if (buildingId && mongoose.Types.ObjectId.isValid(buildingId)) {
    unitFilter.building = buildingId;
  } else if (organizationId && mongoose.Types.ObjectId.isValid(organizationId)) {
    const orgBuildings = await Building.find({ organization: organizationId }).select("_id");
    unitFilter.building = { $in: orgBuildings.map((b) => b._id) };
  }

  const units = await Unit.find(unitFilter).select("_id unitNumber building");
  const targetUnitIds = units.map((u) => u._id);

  const invoiceMatch = {
    unit: { $in: targetUnitIds },
    status: { $ne: "CANCELLED" },
    createdAt: { $gte: startDate, $lte: endDate },
  };

  if (meterId && mongoose.Types.ObjectId.isValid(meterId)) {
    invoiceMatch.meter = new mongoose.Types.ObjectId(meterId);
  }

  // Aggregate monthly consumption and energy cost
  const invoices = await Invoice.find(invoiceMatch).sort({ createdAt: 1 });

  let totalConsumption = 0;
  let totalEnergyCharges = 0;
  const timeSeriesMap = {};

  invoices.forEach((inv) => {
    const period = inv.billingPeriod || inv.createdAt.toISOString().slice(0, 7);
    if (!timeSeriesMap[period]) {
      timeSeriesMap[period] = {
        period,
        consumption: 0,
        energyCharge: 0,
        invoiceCount: 0,
      };
    }
    timeSeriesMap[period].consumption += inv.consumption || 0;
    timeSeriesMap[period].energyCharge += inv.energyCharge || 0;
    timeSeriesMap[period].invoiceCount += 1;

    totalConsumption += inv.consumption || 0;
    totalEnergyCharges += inv.energyCharge || 0;
  });

  const timeSeries = Object.values(timeSeriesMap);

  return {
    summary: {
      totalConsumption: Number(totalConsumption.toFixed(2)),
      totalEnergyCharges: Number(totalEnergyCharges.toFixed(2)),
      averageMonthlyConsumption: timeSeries.length > 0 ? Number((totalConsumption / timeSeries.length).toFixed(2)) : 0,
      invoicesAnalyzed: invoices.length,
    },
    timeSeries,
    dateRange: { from: startDate, to: endDate },
  };
};

/**
 * Revenue analytics: Invoiced vs Collected & Method breakdown
 */
const getRevenueAnalytics = async ({ from, to, organizationId, buildingId, unitId }) => {
  const { startDate, endDate } = getDateBounds(from, to);

  let unitFilter = {};
  if (unitId && mongoose.Types.ObjectId.isValid(unitId)) {
    unitFilter._id = unitId;
  } else if (buildingId && mongoose.Types.ObjectId.isValid(buildingId)) {
    unitFilter.building = buildingId;
  } else if (organizationId && mongoose.Types.ObjectId.isValid(organizationId)) {
    const orgBuildings = await Building.find({ organization: organizationId }).select("_id");
    unitFilter.building = { $in: orgBuildings.map((b) => b._id) };
  }

  const units = await Unit.find(unitFilter).select("_id");
  const targetUnitIds = units.map((u) => u._id);

  const [invoices, payments] = await Promise.all([
    Invoice.find({
      unit: { $in: targetUnitIds },
      createdAt: { $gte: startDate, $lte: endDate },
    }),
    Payment.find({
      paymentDate: { $gte: startDate, $lte: endDate },
      status: "RECORDED",
    }).populate({
      path: "invoice",
      select: "unit billingPeriod totalAmount",
    }),
  ]);

  // Filter payments matching target units
  const scopedPayments = payments.filter((p) => {
    if (!p.invoice?.unit) return false;
    return targetUnitIds.some((uid) => uid.toString() === p.invoice.unit.toString());
  });

  let totalInvoiced = 0;
  let totalCollected = 0;
  let totalPending = 0;
  let totalOverdue = 0;

  const invoiceStatusDistribution = { PAID: 0, PENDING: 0, OVERDUE: 0, CANCELLED: 0 };

  invoices.forEach((inv) => {
    if (inv.status !== "CANCELLED") {
      totalInvoiced += inv.totalAmount || 0;
    }
    if (inv.status === "PENDING") totalPending += inv.totalAmount || 0;
    if (inv.status === "OVERDUE") totalOverdue += inv.totalAmount || 0;

    invoiceStatusDistribution[inv.status] = (invoiceStatusDistribution[inv.status] || 0) + 1;
  });

  const paymentMethodDistribution = { UPI: 0, CASH: 0, BANK_TRANSFER: 0, CARD: 0, OTHER: 0 };

  scopedPayments.forEach((p) => {
    totalCollected += p.amount || 0;
    const method = p.paymentMethod?.toUpperCase() || "OTHER";
    paymentMethodDistribution[method] = (paymentMethodDistribution[method] || 0) + (p.amount || 0);
  });

  // Monthly trends map
  const trendMap = {};
  invoices.forEach((inv) => {
    if (inv.status !== "CANCELLED") {
      const p = inv.billingPeriod || inv.createdAt.toISOString().slice(0, 7);
      if (!trendMap[p]) trendMap[p] = { period: p, invoiced: 0, collected: 0 };
      trendMap[p].invoiced += inv.totalAmount || 0;
    }
  });

  scopedPayments.forEach((p) => {
    const pKey = p.paymentDate.toISOString().slice(0, 7);
    if (!trendMap[pKey]) trendMap[pKey] = { period: pKey, invoiced: 0, collected: 0 };
    trendMap[pKey].collected += p.amount || 0;
  });

  const trends = Object.values(trendMap);

  return {
    summary: {
      totalInvoiced: Number(totalInvoiced.toFixed(2)),
      totalCollected: Number(totalCollected.toFixed(2)),
      totalPending: Number(totalPending.toFixed(2)),
      totalOverdue: Number(totalOverdue.toFixed(2)),
      collectionRate: totalInvoiced > 0 ? Number(((totalCollected / totalInvoiced) * 100).toFixed(1)) : 0,
    },
    trends,
    invoiceStatusDistribution,
    paymentMethodDistribution,
    dateRange: { from: startDate, to: endDate },
  };
};

/**
 * Maintenance analytics: Ticket volume, status, priority, and resolution rates
 */
const getMaintenanceAnalytics = async ({ from, to, organizationId, buildingId, unitId }) => {
  const { startDate, endDate } = getDateBounds(from, to);

  let filter = { createdAt: { $gte: startDate, $lte: endDate } };
  if (unitId && mongoose.Types.ObjectId.isValid(unitId)) {
    filter.unit = unitId;
  } else if (buildingId && mongoose.Types.ObjectId.isValid(buildingId)) {
    filter.building = buildingId;
  } else if (organizationId && mongoose.Types.ObjectId.isValid(organizationId)) {
    const orgBuildings = await Building.find({ organization: organizationId }).select("_id");
    filter.building = { $in: orgBuildings.map((b) => b._id) };
  }

  const requests = await MaintenanceRequest.find(filter);

  const statusCounts = { OPEN: 0, ASSIGNED: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 };
  const priorityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };

  let totalResolutionTimeMs = 0;
  let resolvedCount = 0;

  requests.forEach((r) => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    priorityCounts[r.priority] = (priorityCounts[r.priority] || 0) + 1;

    if (r.resolvedAt && r.createdAt) {
      totalResolutionTimeMs += new Date(r.resolvedAt) - new Date(r.createdAt);
      resolvedCount++;
    }
  });

  const avgResolutionHours = resolvedCount > 0
    ? Number((totalResolutionTimeMs / (resolvedCount * 1000 * 60 * 60)).toFixed(1))
    : 0;

  return {
    summary: {
      totalTickets: requests.length,
      openTickets: statusCounts.OPEN + statusCounts.ASSIGNED + statusCounts.IN_PROGRESS,
      resolvedTickets: statusCounts.RESOLVED + statusCounts.CLOSED,
      urgentPending: requests.filter((r) => r.priority === "URGENT" && !["RESOLVED", "CLOSED"].includes(r.status)).length,
      averageResolutionHours: avgResolutionHours,
    },
    statusDistribution: statusCounts,
    priorityDistribution: priorityCounts,
    dateRange: { from: startDate, to: endDate },
  };
};

/**
 * Building comparative overview for reports and manager insights
 */
const getBuildingComparisonReport = async (organizationId) => {
  const buildingFilter = organizationId ? { organization: organizationId } : {};
  const buildings = await Building.find(buildingFilter).populate("organization", "name");

  const report = await Promise.all(
    buildings.map(async (b) => {
      const units = await Unit.find({ building: b._id }).select("_id");
      const unitIds = units.map((u) => u._id);

      const [metersCount, activeMetersCount, invoices, maintenanceCount] = await Promise.all([
        Meter.countDocuments({ unit: { $in: unitIds } }),
        Meter.countDocuments({ unit: { $in: unitIds }, status: "ACTIVE" }),
        Invoice.find({ unit: { $in: unitIds }, status: { $ne: "CANCELLED" } }),
        MaintenanceRequest.countDocuments({ building: b._id, status: { $in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } }),
      ]);

      const totalConsumption = invoices.reduce((sum, inv) => sum + (inv.consumption || 0), 0);
      const totalBilled = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

      return {
        buildingId: b._id,
        buildingName: b.name,
        buildingCode: b.code,
        organizationName: b.organization?.name || "Global",
        totalUnits: units.length,
        totalMeters: metersCount,
        activeMeters: activeMetersCount,
        totalConsumptionKwh: Number(totalConsumption.toFixed(2)),
        totalBilledAmount: Number(totalBilled.toFixed(2)),
        openMaintenanceTickets: maintenanceCount,
      };
    })
  );

  return report;
};

module.exports = {
  getEnergyAnalytics,
  getRevenueAnalytics,
  getMaintenanceAnalytics,
  getBuildingComparisonReport,
};
