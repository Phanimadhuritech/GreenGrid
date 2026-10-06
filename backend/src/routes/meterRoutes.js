const express = require("express");
const {
  getMeters,
  getMeterById,
  getMetersByUnit,
  createMeter,
  updateMeter,
  deleteMeter,
} = require("../controllers/meterController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);
router.use(authorize("PLATFORM_ADMIN", "FACILITY_MANAGER"));

router.route("/").get(getMeters).post(createMeter);

router.route("/unit/:unitId").get(getMetersByUnit);

router.route("/:id").get(getMeterById).put(updateMeter).delete(deleteMeter);

module.exports = router;
