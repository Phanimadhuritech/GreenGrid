const express = require("express");
const {
  getMeterConsumption,
  getUnitConsumption,
  getBuildingConsumption,
} = require("../controllers/consumptionController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/meter/:meterId", getMeterConsumption);
router.get("/unit/:unitId", getUnitConsumption);
router.get("/building/:buildingId", getBuildingConsumption);

module.exports = router;
