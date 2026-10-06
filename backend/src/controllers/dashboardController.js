const mongoose = require("mongoose");
const Organization = require("../models/Organization");
const Building = require("../models/Building");
const Unit = require("../models/Unit");
const Meter = require("../models/Meter");
const MeterReading = require("../models/MeterReading");
const User = require("../models/User");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const MaintenanceRequest = require("../models/MaintenanceRequest");

// @desc    Get Platform Admin Dashboard Metrics
// @route   GET /api/dashboard/admin
// @access  Private (PLATFORM_ADMIN)
const getAdminDashboard = async (req, res) => {
  try {
    const [
      organizationsCount,
      buildingsCount,
      unitsCount,
      metersTotal,
      metersActive,
      usersCount,
      allInvoices,
      allPayments,
      allMaintenance,
    ] = await Promise.all([
      Organization.countDocuments(),
      Building.countDocuments(),
      Unit.countDocuments(),
      Meter.countDocuments(),
      Meter.countDocuments({ status: "ACTIVE" }),
      User.countDocuments(),
      Invoice.find().select("totalAmount consumption status billingPeriod createdAt dueDate"),
      Payment.find({ status: "RECORDED" }).select("amount paymentMethod paymentDate status"),
      MaintenanceRequest.find().select("status priority createdAt"),
    ]);

    // Financial calculations
    let totalRevenue = 0;
    allPayments.forEach((p) => {
      totalRevenue += p.amount || 0;
    });

    let totalInvoicedAmount = 0;
    let pendingInvoiceAmount = 0;
    let overdueInvoiceAmount = 0;
    let totalEnergyConsumption = 0;

    const invoiceStatusCounts = {
      GENERATED: 0,
      PENDING: 0,
      PAID: 0,
      OVERDUE: 0,
      CANCELLED: 0,
    };

    allInvoices.forEach((inv) => {
      if (inv.status !== "CANCELLED") {
        totalInvoicedAmount += inv.totalAmount || 0;
        totalEnergyConsumption += inv.consumption || 0;
      }
      if (inv.status === "PENDING") {
        pendingInvoiceAmount += inv.totalAmount || 0;
      } else if (inv.status === "OVERDUE") {
        overdueInvoiceAmount += inv.totalAmount || 0;
      }
      invoiceStatusCounts[inv.status] = (invoiceStatusCounts[inv.status] || 0) + 1;
    });

    // Maintenance calculations
    const maintenanceCounts = {
      OPEN: 0,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      CLOSED: 0,
      urgent: 0,
    };

    allMaintenance.forEach((m) => {
      maintenanceCounts[m.status] = (maintenanceCounts[m.status] || 0) + 1;
      if (m.priority === "URGENT" && m.status !== "RESOLVED" && m.status !== "CLOSED") {
        maintenanceCounts.urgent += 1;
      }
    });

    // Monthly trends (group last 6 months)
    const monthlyMap = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = { month: key, consumption: 0, revenue: 0, invoices: 0 };
    }

    allInvoices.forEach((inv) => {
      if (inv.status !== "CANCELLED" && inv.billingPeriod && monthlyMap[inv.billingPeriod]) {
        monthlyMap[inv.billingPeriod].consumption += inv.consumption || 0;
        monthlyMap[inv.billingPeriod].invoices += inv.totalAmount || 0;
      }
    });

    allPayments.forEach((p) => {
      if (p.paymentDate) {
        const pd = new Date(p.paymentDate);
        const pKey = `${pd.getFullYear()}-${String(pd.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyMap[pKey]) {
          monthlyMap[pKey].revenue += p.amount || 0;
        }
      }
    });

    const monthlyTrends = Object.values(monthlyMap);

    // Recent items
    const [recentInvoices, recentPayments, recentMaintenance] = await Promise.all([
      Invoice.find()
        .populate({
          path: "unit",
          select: "unitNumber floor building",
          populate: { path: "building", select: "name code" },
        })
        .sort({ createdAt: -1 })
        .limit(5),
      Payment.find({ status: "RECORDED" })
        .populate({
          path: "invoice",
          select: "invoiceNumber totalAmount",
          populate: { path: "unit", select: "unitNumber" },
        })
        .populate("recordedBy", "name email")
        .sort({ paymentDate: -1 })
        .limit(5),
      MaintenanceRequest.find()
        .populate({
          path: "unit",
          select: "unitNumber floor building",
          populate: { path: "building", select: "name code" },
        })
        .populate("createdBy", "name email")
        .populate("assignedTechnician", "name email")
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    return res.status(200).json({
      overview: {
        organizationsCount,
        buildingsCount,
        unitsCount,
        metersTotal,
        metersActive,
        usersCount,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalInvoicedAmount: Number(totalInvoicedAmount.toFixed(2)),
        pendingInvoiceAmount: Number(pendingInvoiceAmount.toFixed(2)),
        overdueInvoiceAmount: Number(overdueInvoiceAmount.toFixed(2)),
        totalEnergyConsumption: Number(totalEnergyConsumption.toFixed(2)),
      },
      invoiceSummary: {
        total: allInvoices.length,
        ...invoiceStatusCounts,
      },
      maintenanceSummary: {
        total: allMaintenance.length,
        ...maintenanceCounts,
      },
      monthlyTrends,
      recentInvoices,
      recentPayments,
      recentMaintenance,
    });
  } catch (error) {
    console.error("Error fetching admin dashboard:", error);
    return res.status(500).json({ message: "Failed to fetch admin dashboard" });
  }
};

// @desc    Get Facility Manager Dashboard Metrics
// @route   GET /api/dashboard/manager
// @access  Private (FACILITY_MANAGER)
const getManagerDashboard = async (req, res) => {
  try {
    if (!req.user.organization) {
      return res.status(400).json({ message: "Facility Manager is not assigned to an organization" });
    }

    const orgId = req.user.organization?._id || req.user.organization;
    const organization = await Organization.findById(orgId).select("name code status");

    const buildings = await Building.find({ organization: orgId });
    const buildingIds = buildings.map((b) => b._id);

    const units = await Unit.find({ building: { $in: buildingIds } });
    const unitIds = units.map((u) => u._id);

    const meters = await Meter.find({ unit: { $in: unitIds } });
    const meterIds = meters.map((m) => m._id);

    const activeMetersCount = meters.filter((m) => m.status === "ACTIVE").length;

    const [invoices, payments, maintenanceRequests] = await Promise.all([
      Invoice.find({ unit: { $in: unitIds } }),
      Payment.find({
        invoice: {
          $in: (await Invoice.find({ unit: { $in: unitIds } }).select("_id")).map((i) => i._id),
        },
        status: "RECORDED",
      }),
      MaintenanceRequest.find({ building: { $in: buildingIds } }),
    ]);

    let totalEnergyConsumption = 0;
    let totalRevenue = 0;
    let pendingInvoicesAmount = 0;
    let pendingInvoicesCount = 0;

    invoices.forEach((inv) => {
      if (inv.status !== "CANCELLED") {
        totalEnergyConsumption += inv.consumption || 0;
      }
      if (inv.status === "PENDING" || inv.status === "OVERDUE") {
        pendingInvoicesAmount += inv.totalAmount || 0;
        pendingInvoicesCount += 1;
      }
    });

    payments.forEach((p) => {
      totalRevenue += p.amount || 0;
    });

    const maintenanceSummary = {
      total: maintenanceRequests.length,
      open: maintenanceRequests.filter((m) => m.status === "OPEN").length,
      assigned: maintenanceRequests.filter((m) => m.status === "ASSIGNED").length,
      inProgress: maintenanceRequests.filter((m) => m.status === "IN_PROGRESS").length,
      resolved: maintenanceRequests.filter((m) => m.status === "RESOLVED").length,
      closed: maintenanceRequests.filter((m) => m.status === "CLOSED").length,
      urgent: maintenanceRequests.filter((m) => m.priority === "URGENT" && !["RESOLVED", "CLOSED"].includes(m.status)).length,
    };

    // Building breakdown
    const buildingBreakdown = buildings.map((b) => {
      const bUnits = units.filter((u) => u.building.toString() === b._id.toString());
      const bUnitIds = bUnits.map((u) => u._id.toString());
      const bMeters = meters.filter((m) => bUnitIds.includes(m.unit?.toString()));
      const bInvoices = invoices.filter((inv) => bUnitIds.includes(inv.unit?.toString()) && inv.status !== "CANCELLED");
      const bConsumption = bInvoices.reduce((sum, inv) => sum + (inv.consumption || 0), 0);
      return {
        _id: b._id,
        name: b.name,
        code: b.code,
        unitsCount: bUnits.length,
        metersCount: bMeters.length,
        activeMetersCount: bMeters.filter((m) => m.status === "ACTIVE").length,
        consumption: Number(bConsumption.toFixed(2)),
      };
    });

    const recentMaintenance = await MaintenanceRequest.find({ building: { $in: buildingIds } })
      .populate("unit", "unitNumber floor")
      .populate("building", "name code")
      .populate("createdBy", "name email")
      .populate("assignedTechnician", "name email")
      .sort({ createdAt: -1 })
      .limit(5);

    const recentInvoices = await Invoice.find({ unit: { $in: unitIds } })
      .populate({
        path: "unit",
        select: "unitNumber floor building",
        populate: { path: "building", select: "name code" },
      })
      .sort({ createdAt: -1 })
      .limit(5);

    return res.status(200).json({
      organization,
      overview: {
        buildingsCount: buildings.length,
        unitsCount: units.length,
        metersTotal: meters.length,
        activeMetersCount,
        totalEnergyConsumption: Number(totalEnergyConsumption.toFixed(2)),
        totalRevenue: Number(totalRevenue.toFixed(2)),
        pendingInvoicesCount,
        pendingInvoicesAmount: Number(pendingInvoicesAmount.toFixed(2)),
      },
      maintenanceSummary,
      buildingBreakdown,
      recentMaintenance,
      recentInvoices,
    });
  } catch (error) {
    console.error("Error fetching manager dashboard:", error);
    return res.status(500).json({ message: "Failed to fetch manager dashboard" });
  }
};

// @desc    Get Resident Dashboard Metrics
// @route   GET /api/dashboard/resident
// @access  Private (UNIT_USER)
const getResidentDashboard = async (req, res) => {
  try {
    let unit = null;
    if (req.user.unit) {
      unit = await Unit.findById(req.user.unit).populate({
        path: "building",
        select: "name code organization",
        populate: { path: "organization", select: "name" },
      });
    }

    if (!unit) {
      unit = await Unit.findOne({
        $or: [{ owner: req.user._id }, { tenant: req.user._id }],
      }).populate({
        path: "building",
        select: "name code organization",
        populate: { path: "organization", select: "name" },
      });
    }

    if (!unit) {
      return res.status(200).json({
        message: "No assigned unit found for this resident profile.",
        hasUnit: false,
        unit: null,
        meter: null,
        currentConsumption: 0,
        currentInvoice: null,
        openMaintenanceCount: 0,
        recentInvoices: [],
        recentPayments: [],
        recentMaintenance: [],
        consumptionHistory: [],
      });
    }

    const meter = await Meter.findOne({ unit: unit._id });
    const invoices = await Invoice.find({ unit: unit._id }).sort({ createdAt: -1 });
    const payments = await Payment.find({
      invoice: { $in: invoices.map((i) => i._id) },
      status: "RECORDED",
    })
      .populate("invoice", "invoiceNumber billingPeriod")
      .sort({ paymentDate: -1 })
      .limit(5);

    const maintenanceRequests = await MaintenanceRequest.find({ unit: unit._id }).sort({ createdAt: -1 });

    const openMaintenanceCount = maintenanceRequests.filter((m) =>
      ["OPEN", "ASSIGNED", "IN_PROGRESS"].includes(m.status)
    ).length;

    const currentInvoice = invoices.find((inv) => inv.status === "PENDING" || inv.status === "OVERDUE") || invoices[0] || null;

    // Consumption history for past 6 invoices / readings
    const consumptionHistory = invoices
      .filter((inv) => inv.status !== "CANCELLED")
      .slice(0, 6)
      .map((inv) => ({
        billingPeriod: inv.billingPeriod,
        consumption: inv.consumption,
        totalAmount: inv.totalAmount,
        status: inv.status,
      }))
      .reverse();

    return res.status(200).json({
      hasUnit: true,
      unit: {
        _id: unit._id,
        unitNumber: unit.unitNumber,
        floor: unit.floor,
        type: unit.type,
        building: unit.building,
      },
      meter: meter
        ? {
            _id: meter._id,
            meterNumber: meter.meterNumber,
            status: meter.status,
            lastReading: meter.lastReading,
            lastReadingDate: meter.lastReadingDate,
          }
        : null,
      currentConsumption: currentInvoice ? currentInvoice.consumption : meter?.lastReading || 0,
      currentInvoice: currentInvoice
        ? {
            _id: currentInvoice._id,
            invoiceNumber: currentInvoice.invoiceNumber,
            billingPeriod: currentInvoice.billingPeriod,
            totalAmount: currentInvoice.totalAmount,
            consumption: currentInvoice.consumption,
            dueDate: currentInvoice.dueDate,
            status: currentInvoice.status,
          }
        : null,
      openMaintenanceCount,
      recentInvoices: invoices.slice(0, 5),
      recentPayments: payments,
      recentMaintenance: maintenanceRequests.slice(0, 5),
      consumptionHistory,
    });
  } catch (error) {
    console.error("Error fetching resident dashboard:", error);
    return res.status(500).json({ message: "Failed to fetch resident dashboard" });
  }
};

// @desc    Get Technician Dashboard Metrics
// @route   GET /api/dashboard/technician
// @access  Private (TECHNICIAN)
const getTechnicianDashboard = async (req, res) => {
  try {
    const assignedTasks = await MaintenanceRequest.find({ assignedTechnician: req.user._id })
      .populate({
        path: "unit",
        select: "unitNumber floor building owner tenant",
        populate: [
          { path: "building", select: "name code" },
          { path: "owner", select: "name email phone" },
          { path: "tenant", select: "name email phone" },
        ],
      })
      .populate("building", "name code")
      .populate("createdBy", "name email phone")
      .sort({ priority: 1, createdAt: -1 });

    const totalAssigned = assignedTasks.length;
    const assignedCount = assignedTasks.filter((t) => t.status === "ASSIGNED").length;
    const inProgressCount = assignedTasks.filter((t) => t.status === "IN_PROGRESS").length;
    const resolvedCount = assignedTasks.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED").length;
    const urgentCount = assignedTasks.filter(
      (t) => t.priority === "URGENT" && !["RESOLVED", "CLOSED"].includes(t.status)
    ).length;

    const activeTasks = assignedTasks.filter((t) => ["ASSIGNED", "IN_PROGRESS"].includes(t.status));
    const recentlyResolved = assignedTasks
      .filter((t) => ["RESOLVED", "CLOSED"].includes(t.status))
      .slice(0, 5);

    return res.status(200).json({
      overview: {
        totalAssigned,
        assignedCount,
        inProgressCount,
        resolvedCount,
        urgentCount,
      },
      activeTasks,
      recentlyResolved,
    });
  } catch (error) {
    console.error("Error fetching technician dashboard:", error);
    return res.status(500).json({ message: "Failed to fetch technician dashboard" });
  }
};

// @desc    Get Finance Officer Dashboard Metrics
// @route   GET /api/dashboard/finance
// @access  Private (FINANCE_OFFICER, PLATFORM_ADMIN)
const getFinanceDashboard = async (req, res) => {
  try {
    const [invoices, payments] = await Promise.all([
      Invoice.find().populate({
        path: "unit",
        select: "unitNumber floor building",
        populate: { path: "building", select: "name code organization" },
      }),
      Payment.find({ status: "RECORDED" })
        .populate({
          path: "invoice",
          select: "invoiceNumber totalAmount status",
          populate: { path: "unit", select: "unitNumber" },
        })
        .populate("recordedBy", "name email")
        .sort({ paymentDate: -1 }),
    ]);

    let totalRevenue = 0;
    const paymentMethods = { UPI: 0, CASH: 0, BANK_TRANSFER: 0, CARD: 0, OTHER: 0 };

    payments.forEach((p) => {
      totalRevenue += p.amount || 0;
      const method = p.paymentMethod?.toUpperCase() || "OTHER";
      paymentMethods[method] = (paymentMethods[method] || 0) + (p.amount || 0);
    });

    let totalInvoiced = 0;
    let pendingAmount = 0;
    let overdueAmount = 0;

    const invoiceCounts = {
      total: invoices.length,
      PAID: 0,
      PENDING: 0,
      OVERDUE: 0,
      CANCELLED: 0,
    };

    invoices.forEach((inv) => {
      if (inv.status !== "CANCELLED") {
        totalInvoiced += inv.totalAmount || 0;
      }
      if (inv.status === "PENDING") {
        pendingAmount += inv.totalAmount || 0;
      } else if (inv.status === "OVERDUE") {
        overdueAmount += inv.totalAmount || 0;
      }
      invoiceCounts[inv.status] = (invoiceCounts[inv.status] || 0) + 1;
    });

    // 6-month revenue & billed trends
    const trendsMap = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      trendsMap[key] = { month: key, invoiced: 0, collected: 0 };
    }

    invoices.forEach((inv) => {
      if (inv.status !== "CANCELLED" && inv.billingPeriod && trendsMap[inv.billingPeriod]) {
        trendsMap[inv.billingPeriod].invoiced += inv.totalAmount || 0;
      }
    });

    payments.forEach((p) => {
      if (p.paymentDate) {
        const pd = new Date(p.paymentDate);
        const pKey = `${pd.getFullYear()}-${String(pd.getMonth() + 1).padStart(2, "0")}`;
        if (trendsMap[pKey]) {
          trendsMap[pKey].collected += p.amount || 0;
        }
      }
    });

    const monthlyTrends = Object.values(trendsMap);
    const pendingInvoices = invoices.filter((i) => i.status === "PENDING" || i.status === "OVERDUE").slice(0, 8);
    const recentPayments = payments.slice(0, 8);

    return res.status(200).json({
      overview: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalInvoiced: Number(totalInvoiced.toFixed(2)),
        pendingAmount: Number(pendingAmount.toFixed(2)),
        overdueAmount: Number(overdueAmount.toFixed(2)),
      },
      invoiceCounts,
      paymentMethods,
      monthlyTrends,
      pendingInvoices,
      recentPayments,
    });
  } catch (error) {
    console.error("Error fetching finance dashboard:", error);
    return res.status(500).json({ message: "Failed to fetch finance dashboard" });
  }
};

module.exports = {
  getAdminDashboard,
  getManagerDashboard,
  getResidentDashboard,
  getTechnicianDashboard,
  getFinanceDashboard,
};
