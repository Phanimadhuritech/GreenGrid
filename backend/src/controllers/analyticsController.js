const analyticsService = require("../services/analyticsService");
const Unit = require("../models/Unit");

// Helper to enforce role scoping on query params
const applyRoleScope = async (req) => {
  let { organization, building, unit, from, to } = req.query;

  if (req.user.role === "FACILITY_MANAGER" && req.user.organization) {
    organization = req.user.organization.toString();
  } else if (req.user.role === "UNIT_USER") {
    if (req.user.unit) {
      unit = req.user.unit.toString();
    } else {
      const userUnit = await Unit.findOne({
        $or: [{ owner: req.user._id }, { tenant: req.user._id }],
      });
      if (userUnit) unit = userUnit._id.toString();
    }
  }

  return { from, to, organizationId: organization, buildingId: building, unitId: unit };
};

// @desc    Get energy consumption analytics
// @route   GET /api/analytics/energy
// @access  Private
const getEnergyAnalytics = async (req, res) => {
  try {
    const scope = await applyRoleScope(req);
    const data = await analyticsService.getEnergyAnalytics(scope);
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error in getEnergyAnalytics:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch energy analytics" });
  }
};

// @desc    Get revenue & collections analytics
// @route   GET /api/analytics/revenue
// @access  Private (ADMIN, MANAGER, FINANCE, RESIDENT)
const getRevenueAnalytics = async (req, res) => {
  try {
    if (req.user.role === "TECHNICIAN") {
      return res.status(403).json({ message: "Technicians cannot access revenue analytics" });
    }
    const scope = await applyRoleScope(req);
    const data = await analyticsService.getRevenueAnalytics(scope);
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error in getRevenueAnalytics:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch revenue analytics" });
  }
};

// @desc    Get maintenance analytics
// @route   GET /api/analytics/maintenance
// @access  Private
const getMaintenanceAnalytics = async (req, res) => {
  try {
    if (req.user.role === "FINANCE_OFFICER") {
      return res.status(403).json({ message: "Finance officers cannot access maintenance analytics" });
    }
    const scope = await applyRoleScope(req);
    const data = await analyticsService.getMaintenanceAnalytics(scope);
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error in getMaintenanceAnalytics:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch maintenance analytics" });
  }
};

// @desc    Get building comparison report
// @route   GET /api/analytics/buildings
// @access  Private (ADMIN, MANAGER, FINANCE)
const getBuildingComparison = async (req, res) => {
  try {
    let orgId = req.query.organization;
    if (req.user.role === "FACILITY_MANAGER" && req.user.organization) {
      orgId = req.user.organization.toString();
    }
    const data = await analyticsService.getBuildingComparisonReport(orgId);
    return res.status(200).json({ count: data.length, buildings: data });
  } catch (error) {
    console.error("Error in getBuildingComparison:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch building report" });
  }
};

// @desc    Get complete overview analytics
// @route   GET /api/analytics/overview
// @access  Private
const getOverviewAnalytics = async (req, res) => {
  try {
    const scope = await applyRoleScope(req);
    const [energy, revenue, maintenance] = await Promise.all([
      analyticsService.getEnergyAnalytics(scope),
      req.user.role !== "TECHNICIAN" ? analyticsService.getRevenueAnalytics(scope) : null,
      req.user.role !== "FINANCE_OFFICER" ? analyticsService.getMaintenanceAnalytics(scope) : null,
    ]);

    return res.status(200).json({
      energy: energy.summary,
      revenue: revenue ? revenue.summary : null,
      maintenance: maintenance ? maintenance.summary : null,
      energyTimeSeries: energy.timeSeries,
      revenueTrends: revenue ? revenue.trends : [],
      statusDistribution: revenue ? revenue.invoiceStatusDistribution : null,
    });
  } catch (error) {
    console.error("Error in getOverviewAnalytics:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch overview analytics" });
  }
};

// @desc    Export report data as CSV formatted string
// @route   GET /api/analytics/export
// @access  Private (ADMIN, MANAGER, FINANCE)
const exportCsvReport = async (req, res) => {
  try {
    const { type = "energy" } = req.query;
    const scope = await applyRoleScope(req);

    if (type === "energy") {
      const data = await analyticsService.getEnergyAnalytics(scope);
      let csv = "Period,Consumption_kWh,EnergyCharge_INR,InvoiceCount\n";
      data.timeSeries.forEach((row) => {
        csv += `${row.period},${row.consumption},${row.energyCharge},${row.invoiceCount}\n`;
      });
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=GreenGrid_Energy_Report_${Date.now()}.csv`);
      return res.status(200).send(csv);
    }

    if (type === "buildings") {
      const data = await analyticsService.getBuildingComparisonReport(scope.organizationId);
      let csv = "BuildingName,Code,Organization,Units,Meters,ActiveMeters,Consumption_kWh,Billed_INR,OpenTickets\n";
      data.forEach((b) => {
        csv += `"${b.buildingName}","${b.buildingCode}","${b.organizationName}",${b.totalUnits},${b.totalMeters},${b.activeMeters},${b.totalConsumptionKwh},${b.totalBilledAmount},${b.openMaintenanceTickets}\n`;
      });
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=GreenGrid_Buildings_Report_${Date.now()}.csv`);
      return res.status(200).send(csv);
    }

    return res.status(400).json({ message: "Unsupported export type. Allowed: energy, buildings" });
  } catch (error) {
    console.error("Error exporting report:", error);
    return res.status(500).json({ message: "Failed to export CSV report" });
  }
};

module.exports = {
  getEnergyAnalytics,
  getRevenueAnalytics,
  getMaintenanceAnalytics,
  getBuildingComparison,
  getOverviewAnalytics,
  exportCsvReport,
};
