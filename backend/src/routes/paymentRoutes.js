const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
  recordPayment,
  getPayments,
  getMyPayments,
  getPaymentById,
} = require("../controllers/paymentController");

// All payment routes require authentication
router.use(protect);

router.get("/my", getMyPayments);

router
  .route("/")
  .get(getPayments)
  .post(authorize("PLATFORM_ADMIN", "FINANCE_OFFICER", "FACILITY_MANAGER"), recordPayment);

router.route("/:id").get(getPaymentById);

module.exports = router;
