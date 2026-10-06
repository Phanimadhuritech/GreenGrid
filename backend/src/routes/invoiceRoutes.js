const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
  generateInvoice,
  getInvoices,
  getMyInvoices,
  getInvoiceById,
  updateInvoice,
} = require("../controllers/invoiceController");

// All invoice routes require authentication
router.use(protect);

// Specific subroutes before parameterized routes
router.get("/my", getMyInvoices);

router
  .route("/")
  .get(getInvoices)
  .post(authorize("PLATFORM_ADMIN", "FACILITY_MANAGER", "FINANCE_OFFICER"), generateInvoice);

router.post(
  "/generate",
  authorize("PLATFORM_ADMIN", "FACILITY_MANAGER", "FINANCE_OFFICER"),
  generateInvoice
);

router
  .route("/:id")
  .get(getInvoiceById)
  .put(authorize("PLATFORM_ADMIN", "FACILITY_MANAGER", "FINANCE_OFFICER"), updateInvoice);

module.exports = router;
