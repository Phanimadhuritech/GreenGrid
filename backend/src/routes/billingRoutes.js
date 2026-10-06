const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  calculateBill,
  getMeterBill,
  getUnitBill,
} = require("../controllers/billingController");

// All billing calculation routes require authentication
router.use(protect);

router.post("/calculate", calculateBill);
router.get("/meter/:meterId", getMeterBill);
router.get("/unit/:unitId", getUnitBill);

module.exports = router;
