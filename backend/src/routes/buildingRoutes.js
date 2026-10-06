const express = require("express");
const {
  getBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding,
} = require("../controllers/buildingController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);

router
  .route("/")
  .get(getBuildings)
  .post(authorize("PLATFORM_ADMIN", "FACILITY_MANAGER"), createBuilding);

router
  .route("/:id")
  .get(getBuildingById)
  .put(authorize("PLATFORM_ADMIN", "FACILITY_MANAGER"), updateBuilding)
  .delete(authorize("PLATFORM_ADMIN", "FACILITY_MANAGER"), deleteBuilding);

module.exports = router;
