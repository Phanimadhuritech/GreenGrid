const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
  getEnergyAnalytics,
  getRevenueAnalytics,
  getMaintenanceAnalytics,
  getBuildingComparison,
  getOverviewAnalytics,
  exportCsvReport,
} = require("../controllers/analyticsController");

router.use(protect);

router.get("/overview", getOverviewAnalytics);
router.get("/energy", getEnergyAnalytics);
router.get("/revenue", getRevenueAnalytics);
router.get("/maintenance", getMaintenanceAnalytics);
router.get("/buildings", authorize("PLATFORM_ADMIN", "FACILITY_MANAGER", "FINANCE_OFFICER"), getBuildingComparison);
router.get("/export", authorize("PLATFORM_ADMIN", "FACILITY_MANAGER", "FINANCE_OFFICER"), exportCsvReport);

module.exports = router;
