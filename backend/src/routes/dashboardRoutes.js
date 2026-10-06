const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
  getAdminDashboard,
  getManagerDashboard,
  getResidentDashboard,
  getTechnicianDashboard,
  getFinanceDashboard,
} = require("../controllers/dashboardController");

// All dashboard routes require authentication
router.use(protect);

router.get("/admin", authorize("PLATFORM_ADMIN"), getAdminDashboard);
router.get("/manager", authorize("FACILITY_MANAGER", "PLATFORM_ADMIN"), getManagerDashboard);
router.get("/resident", authorize("UNIT_USER", "PLATFORM_ADMIN"), getResidentDashboard);
router.get("/technician", authorize("TECHNICIAN", "PLATFORM_ADMIN"), getTechnicianDashboard);
router.get("/finance", authorize("FINANCE_OFFICER", "PLATFORM_ADMIN"), getFinanceDashboard);

module.exports = router;
