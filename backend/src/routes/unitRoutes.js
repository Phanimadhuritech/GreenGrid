const express = require("express");
const {
  getUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
} = require("../controllers/unitController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);

router
  .route("/")
  .get(getUnits)
  .post(authorize("PLATFORM_ADMIN", "FACILITY_MANAGER"), createUnit);

router
  .route("/:id")
  .get(getUnitById)
  .put(authorize("PLATFORM_ADMIN", "FACILITY_MANAGER"), updateUnit)
  .delete(authorize("PLATFORM_ADMIN", "FACILITY_MANAGER"), deleteUnit);

module.exports = router;
