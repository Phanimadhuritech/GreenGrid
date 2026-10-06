const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
  getTariffs,
  getTariffById,
  createTariff,
  updateTariff,
  deleteTariff,
} = require("../controllers/tariffController");

// All tariff routes require authentication
router.use(protect);

router
  .route("/")
  .get(authorize("PLATFORM_ADMIN", "FACILITY_MANAGER"), getTariffs)
  .post(authorize("PLATFORM_ADMIN"), createTariff);

router
  .route("/:id")
  .get(authorize("PLATFORM_ADMIN", "FACILITY_MANAGER"), getTariffById)
  .put(authorize("PLATFORM_ADMIN"), updateTariff)
  .delete(authorize("PLATFORM_ADMIN"), deleteTariff);

module.exports = router;
