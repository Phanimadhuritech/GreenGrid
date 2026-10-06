const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const Invoice = require("../models/Invoice");
const Unit = require("../models/Unit");
const Building = require("../models/Building");

// @desc    Record a payment against an invoice
// @route   POST /api/payments
// @access  Private (PLATFORM_ADMIN, FINANCE_OFFICER, FACILITY_MANAGER)
const recordPayment = async (req, res) => {
  try {
    const { invoiceId, amount, paymentMethod, transactionReference, notes, paymentDate } = req.body;

    if (!invoiceId) {
      return res.status(400).json({ message: "invoiceId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({ message: "Invalid invoiceId format" });
    }

    if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ message: "Payment amount must be a positive number greater than 0" });
    }

    const payAmount = Number(Number(amount).toFixed(2));

    const validMethods = ["UPI", "CASH", "BANK_TRANSFER", "CARD", "OTHER"];
    if (!paymentMethod || !validMethods.includes(paymentMethod.toUpperCase())) {
      return res.status(400).json({
        message: `Invalid payment method. Allowed values: ${validMethods.join(", ")}`,
      });
    }

    // 1. Fetch invoice and verify organization access
    const invoice = await Invoice.findById(invoiceId).populate({
      path: "unit",
      populate: { path: "building", select: "name code organization" },
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // RBAC organization validation for Facility Manager
    if (req.user.role === "FACILITY_MANAGER" && req.user.organization) {
      const orgId = invoice.unit?.building?.organization?.toString();
      if (orgId !== req.user.organization.toString()) {
        return res.status(403).json({
          message: "You cannot record payments for invoices outside your organization",
        });
      }
    }

    // 2. State & Overpayment validation
    if (invoice.status === "CANCELLED") {
      return res.status(400).json({
        message: "Cannot record payment against a cancelled invoice.",
      });
    }

    if (invoice.status === "PAID") {
      return res.status(400).json({
        message: "Invoice is already fully paid. No further payments accepted.",
      });
    }

    // Calculate existing payments made against this invoice
    const existingPayments = await Payment.find({
      invoice: invoiceId,
      status: "RECORDED",
    });

    const alreadyPaid = existingPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const outstanding = Number((invoice.totalAmount - alreadyPaid).toFixed(2));

    if (payAmount > outstanding + 0.001) {
      return res.status(400).json({
        message: `Payment amount (₹${payAmount}) exceeds outstanding invoice balance (₹${outstanding}). Overpayment is not permitted.`,
        outstandingBalance: outstanding,
      });
    }

    // 3. Create Payment document
    const payment = await Payment.create({
      invoice: invoiceId,
      amount: payAmount,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod: paymentMethod.toUpperCase(),
      transactionReference: transactionReference ? transactionReference.trim() : "",
      status: "RECORDED",
      recordedBy: req.user._id,
      notes: notes ? notes.trim() : "",
    });

    // 4. Update Invoice status if now fully paid
    const newTotalPaid = Number((alreadyPaid + payAmount).toFixed(2));
    let invoiceUpdated = false;

    if (newTotalPaid >= invoice.totalAmount - 0.001) {
      invoice.status = "PAID";
      invoice.paidAt = new Date();
      await invoice.save();
      invoiceUpdated = true;
    }

    const populatedPayment = await Payment.findById(payment._id)
      .populate({
        path: "invoice",
        select: "invoiceNumber billingPeriod totalAmount status dueDate",
        populate: {
          path: "unit",
          select: "unitNumber floor building",
          populate: { path: "building", select: "name code" },
        },
      })
      .populate("recordedBy", "name email role");

    return res.status(201).json({
      message: "Payment recorded successfully",
      payment: populatedPayment,
      invoiceStatus: invoice.status,
      totalPaid: newTotalPaid,
      outstandingBalance: Math.max(0, Number((invoice.totalAmount - newTotalPaid).toFixed(2))),
    });
  } catch (error) {
    console.error("Error recording payment:", error);
    return res.status(500).json({
      message: error.message || "Failed to record payment",
    });
  }
};

// @desc    Get payments with role-based scoping and pagination
// @route   GET /api/payments
// @access  Private
const getPayments = async (req, res) => {
  try {
    const { invoiceId, status, paymentMethod, startDate, endDate, page = 1, limit = 50 } = req.query;
    let filter = {};

    // 1. Role-based isolation
    if (req.user.role === "UNIT_USER") {
      const userUnits = await Unit.find({
        $or: [{ owner: req.user._id }, { tenant: req.user._id }, { _id: req.user.unit }],
      }).select("_id");
      const userInvoices = await Invoice.find({ unit: { $in: userUnits.map((u) => u._id) } }).select("_id");
      filter.invoice = { $in: userInvoices.map((inv) => inv._id) };
    } else if (req.user.role === "FACILITY_MANAGER" && req.user.organization) {
      const orgBuildings = await Building.find({ organization: req.user.organization }).select("_id");
      const orgUnits = await Unit.find({ building: { $in: orgBuildings.map((b) => b._id) } }).select("_id");
      const orgInvoices = await Invoice.find({ unit: { $in: orgUnits.map((u) => u._id) } }).select("_id");
      filter.invoice = { $in: orgInvoices.map((inv) => inv._id) };
    } else if (req.user.role === "TECHNICIAN") {
      return res.status(403).json({
        message: "Technicians do not have access to financial payments",
      });
    }

    // 2. Query filters
    if (invoiceId) {
      if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
        return res.status(400).json({ message: "Invalid invoiceId in query" });
      }
      if (filter.invoice && filter.invoice.$in) {
        const allowed = filter.invoice.$in.map((id) => id.toString());
        if (!allowed.includes(invoiceId.toString())) {
          return res.status(200).json({ count: 0, payments: [] });
        }
      }
      filter.invoice = invoiceId;
    }

    if (status) {
      filter.status = status.toUpperCase();
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod.toUpperCase();
    }

    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate);
      if (endDate) filter.paymentDate.$lte = new Date(endDate);
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter)
      .populate({
        path: "invoice",
        select: "invoiceNumber billingPeriod totalAmount status dueDate unit meter",
        populate: [
          {
            path: "unit",
            select: "unitNumber floor building",
            populate: { path: "building", select: "name code organization" },
          },
          { path: "meter", select: "meterNumber" },
        ],
      })
      .populate("recordedBy", "name email role")
      .sort({ paymentDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      count: totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      currentPage: pageNum,
      payments,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return res.status(500).json({ message: "Failed to retrieve payments" });
  }
};

// @desc    Get resident's own payments
// @route   GET /api/payments/my
// @access  Private (UNIT_USER)
const getMyPayments = async (req, res) => {
  try {
    const userUnits = await Unit.find({
      $or: [{ owner: req.user._id }, { tenant: req.user._id }, { _id: req.user.unit }],
    }).select("_id");

    const userInvoices = await Invoice.find({ unit: { $in: userUnits.map((u) => u._id) } }).select("_id");

    const payments = await Payment.find({ invoice: { $in: userInvoices.map((inv) => inv._id) } })
      .populate({
        path: "invoice",
        select: "invoiceNumber billingPeriod totalAmount status",
        populate: {
          path: "unit",
          select: "unitNumber floor building",
          populate: { path: "building", select: "name code" },
        },
      })
      .populate("recordedBy", "name email")
      .sort({ paymentDate: -1 });

    return res.status(200).json({
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error("Error fetching my payments:", error);
    return res.status(500).json({ message: "Failed to retrieve your payments" });
  }
};

// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Private
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid payment ID format" });
    }

    const payment = await Payment.findById(id)
      .populate({
        path: "invoice",
        populate: [
          {
            path: "unit",
            select: "unitNumber floor building owner tenant",
            populate: [
              { path: "building", select: "name code organization" },
              { path: "owner", select: "name email" },
              { path: "tenant", select: "name email" },
            ],
          },
          { path: "meter", select: "meterNumber" },
        ],
      })
      .populate("recordedBy", "name email role");

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // RBAC validation
    if (req.user.role === "UNIT_USER") {
      const unit = payment.invoice?.unit;
      const isOwner = unit?.owner?._id?.toString() === req.user._id.toString();
      const isTenant = unit?.tenant?._id?.toString() === req.user._id.toString();
      const isAssigned = req.user.unit && req.user.unit.toString() === unit?._id?.toString();

      if (!isOwner && !isTenant && !isAssigned) {
        return res.status(403).json({
          message: "You are not authorized to view this payment record",
        });
      }
    } else if (req.user.role === "FACILITY_MANAGER" && req.user.organization) {
      const orgId = payment.invoice?.unit?.building?.organization?.toString();
      if (orgId !== req.user.organization.toString()) {
        return res.status(403).json({
          message: "You cannot access payments outside your organization",
        });
      }
    } else if (req.user.role === "TECHNICIAN") {
      return res.status(403).json({
        message: "Technicians do not have access to financial payments",
      });
    }

    return res.status(200).json({ payment });
  } catch (error) {
    console.error("Error fetching payment details:", error);
    return res.status(500).json({ message: "Failed to fetch payment details" });
  }
};

module.exports = {
  recordPayment,
  getPayments,
  getMyPayments,
  getPaymentById,
};
