const express = require("express");
const {
  getReadings,
  getReadingById,
  getReadingsByMeter,
  createReading,
  updateReading,
  deleteReading,
} = require("../controllers/readingController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);

router
  .route("/")
  .get(getReadings)
  .post(authorize("PLATFORM_ADMIN", "FACILITY_MANAGER"), createReading);

router.route("/meter/:meterId").get(getReadingsByMeter);

router
  .route("/:id")
  .get(getReadingById)
  .put(authorize("PLATFORM_ADMIN", "FACILITY_MANAGER"), updateReading)
  .delete(authorize("PLATFORM_ADMIN", "FACILITY_MANAGER"), deleteReading);

module.exports = router;
