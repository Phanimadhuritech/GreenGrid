const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
  createMaintenanceRequest,
  getMaintenanceRequests,
  getMyMaintenanceRequests,
  getAssignedMaintenanceRequests,
  getMaintenanceRequestById,
  assignTechnician,
  updateMaintenanceRequest,
  deleteMaintenanceRequest,
  getTechnicians,
} = require("../controllers/maintenanceController");

// All maintenance routes require authentication
router.use(protect);

router.get("/technicians", authorize("PLATFORM_ADMIN", "FACILITY_MANAGER"), getTechnicians);
router.get("/my", getMyMaintenanceRequests);
router.get(
  "/assigned",
  authorize("TECHNICIAN", "PLATFORM_ADMIN", "FACILITY_MANAGER"),
  getAssignedMaintenanceRequests
);

router
  .route("/")
  .get(getMaintenanceRequests)
  .post(
    authorize("UNIT_USER", "FACILITY_MANAGER", "PLATFORM_ADMIN"),
    createMaintenanceRequest
  );

router.put(
  "/:id/assign",
  authorize("PLATFORM_ADMIN", "FACILITY_MANAGER"),
  assignTechnician
);

router
  .route("/:id")
  .get(getMaintenanceRequestById)
  .put(updateMaintenanceRequest)
  .delete(
    authorize("PLATFORM_ADMIN", "FACILITY_MANAGER", "UNIT_USER"),
    deleteMaintenanceRequest
  );

module.exports = router;
