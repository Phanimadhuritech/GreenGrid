const mongoose = require("mongoose");
const Invoice = require("../models/Invoice");
const Unit = require("../models/Unit");
const Meter = require("../models/Meter");
const Building = require("../models/Building");
const Tariff = require("../models/Tariff");
const billingService = require("../services/billingService");

/**
 * Generate a clean sequential invoice number
 */
const generateInvoiceNumber = async (billingPeriod) => {
  const cleanPeriod = (billingPeriod || "BILL").replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  const year = new Date().getFullYear();
  const prefix = `INV-${cleanPeriod || year}`;

  const count = await Invoice.countDocuments();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${String(count + 1).padStart(4, "0")}-${randomSuffix}`;
};

// @desc    Generate a new invoice for a unit
// @route   POST /api/invoices/generate
// @access  Private (PLATFORM_ADMIN, FACILITY_MANAGER, FINANCE_OFFICER)
const generateInvoice = async (req, res) => {
  try {
    const { unitId, billingPeriod, dueDate, customTariffId, notes } = req.body;

    if (!unitId) {
      return res.status(400).json({ message: "unitId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(unitId)) {
      return res.status(400).json({ message: "Invalid unitId format" });
    }

    if (!billingPeriod || typeof billingPeriod !== "string" || !billingPeriod.trim()) {
      return res.status(400).json({ message: "billingPeriod is required (e.g. '2026-09')" });
    }

    const trimmedPeriod = billingPeriod.trim();

    // 1. Fetch unit and verify organization access
    const unit = await Unit.findById(unitId).populate({
      path: "building",
      select: "name code organization",
    });

    if (!unit) {
      return res.status(404).json({ message: "Unit not found" });
    }

    // Facility Manager organization check
    if (req.user.role === "FACILITY_MANAGER") {
      if (
        !req.user.organization ||
        !unit.building ||
        unit.building.organization.toString() !== req.user.organization.toString()
      ) {
        return res.status(403).json({
          message: "You are not authorized to generate invoices for units outside your organization",
        });
      }
    }

    // 2. Prevent duplicate invoice for same unit and billing period
    const existingInvoice = await Invoice.findOne({
      unit: unitId,
      billingPeriod: trimmedPeriod,
      status: { $ne: "CANCELLED" },
    });

    if (existingInvoice) {
      return res.status(409).json({
        message: `Invoice already exists for this unit in billing period ${trimmedPeriod} (${existingInvoice.invoiceNumber})`,
        invoice: existingInvoice,
      });
    }

    // 3. Find active meter for unit
    let meter = await Meter.findOne({ unit: unitId, status: "ACTIVE" });
    if (!meter) {
      meter = await Meter.findOne({ unit: unitId });
    }

    if (!meter) {
      return res.status(400).json({
        message: "No meter is currently assigned to this unit. Cannot generate electricity invoice.",
      });
    }

    // 4. Calculate bill using existing billingService
    const billCalculation = await billingService.calculateMeterBill(
      meter._id,
      null,
      null,
      customTariffId || null
    );

    // 5. Generate unique invoice number
    let invoiceNumber = await generateInvoiceNumber(trimmedPeriod);
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 5) {
      const collision = await Invoice.findOne({ invoiceNumber });
      if (!collision) {
        isUnique = true;
      } else {
        invoiceNumber = await generateInvoiceNumber(trimmedPeriod);
        attempts++;
      }
    }

    // Set due date (default: 15 days from now if not specified)
    const calculatedDueDate = dueDate
      ? new Date(dueDate)
      : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    if (isNaN(calculatedDueDate.getTime())) {
      return res.status(400).json({ message: "Invalid due date format" });
    }

    // 6. Create Invoice record in database
    const invoice = await Invoice.create({
      invoiceNumber,
      unit: unitId,
      meter: meter._id,
      billingPeriod: trimmedPeriod,
      previousReading: billCalculation.billingPeriod?.startReading ?? 0,
      currentReading: billCalculation.billingPeriod?.endReading ?? 0,
      consumption: billCalculation.consumption,
      energyCharge: billCalculation.energyCharge,
      fixedCharge: billCalculation.fixedCharge,
      tax: billCalculation.tax,
      adjustment: billCalculation.adjustment,
      totalAmount: billCalculation.totalAmount,
      slabBreakdown: billCalculation.slabBreakdown || [],
      tariff: billCalculation.tariff?._id || null,
      issueDate: new Date(),
      dueDate: calculatedDueDate,
      status: "PENDING",
      notes: notes ? notes.trim() : "",
    });

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate({
        path: "unit",
        select: "unitNumber floor type building owner tenant",
        populate: [
          { path: "building", select: "name code organization" },
          { path: "owner", select: "name email" },
          { path: "tenant", select: "name email" },
        ],
      })
      .populate("meter", "meterNumber type status")
      .populate("tariff", "name fixedCharge taxPercentage");

    return res.status(201).json({
      message: "Invoice generated successfully",
      invoice: populatedInvoice,
    });
  } catch (error) {
    console.error("Error generating invoice:", error);
    return res.status(500).json({
      message: error.message || "Failed to generate invoice",
    });
  }
};

// @desc    Get all invoices with role-based filtering and pagination
// @route   GET /api/invoices
// @access  Private
const getInvoices = async (req, res) => {
  try {
    const { unit, building, status, billingPeriod, search, page = 1, limit = 50 } = req.query;
    let filter = {};

    // 1. Role-based isolation
    if (req.user.role === "UNIT_USER") {
      // Find units associated with this resident
      const userUnits = await Unit.find({
        $or: [{ owner: req.user._id }, { tenant: req.user._id }, { _id: req.user.unit }],
      }).select("_id");
      const unitIds = userUnits.map((u) => u._id);
      filter.unit = { $in: unitIds };
    } else if (req.user.role === "FACILITY_MANAGER" && req.user.organization) {
      const orgBuildings = await Building.find({ organization: req.user.organization }).select("_id");
      const orgUnits = await Unit.find({ building: { $in: orgBuildings.map((b) => b._id) } }).select("_id");
      filter.unit = { $in: orgUnits.map((u) => u._id) };
    } else if (req.user.role === "TECHNICIAN") {
      return res.status(403).json({
        message: "Technicians do not have access to invoice financial records",
      });
    }

    // 2. Additional query filters
    if (unit) {
      if (!mongoose.Types.ObjectId.isValid(unit)) {
        return res.status(400).json({ message: "Invalid unit ID format in query" });
      }
      if (filter.unit && filter.unit.$in) {
        const allowedIds = filter.unit.$in.map((id) => id.toString());
        if (!allowedIds.includes(unit.toString())) {
          return res.status(200).json({ count: 0, invoices: [] });
        }
      }
      filter.unit = unit;
    }

    if (building && !unit) {
      if (!mongoose.Types.ObjectId.isValid(building)) {
        return res.status(400).json({ message: "Invalid building ID format in query" });
      }
      const bUnits = await Unit.find({ building }).select("_id");
      const bUnitIds = bUnits.map((u) => u._id);
      if (filter.unit && filter.unit.$in) {
        const allowedIds = filter.unit.$in.map((id) => id.toString());
        const intersection = bUnitIds.filter((id) => allowedIds.includes(id.toString()));
        filter.unit = { $in: intersection };
      } else {
        filter.unit = { $in: bUnitIds };
      }
    }

    if (status) {
      filter.status = status.toUpperCase();
    }

    if (billingPeriod) {
      filter.billingPeriod = billingPeriod;
    }

    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { billingPeriod: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter)
      .populate({
        path: "unit",
        select: "unitNumber floor type building owner tenant",
        populate: [
          { path: "building", select: "name code organization" },
          { path: "owner", select: "name email" },
          { path: "tenant", select: "name email" },
        ],
      })
      .populate("meter", "meterNumber type status")
      .populate("tariff", "name fixedCharge taxPercentage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      count: totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      currentPage: pageNum,
      invoices,
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return res.status(500).json({ message: "Failed to retrieve invoices" });
  }
};

// @desc    Get resident's own invoices
// @route   GET /api/invoices/my
// @access  Private (UNIT_USER, Resident)
const getMyInvoices = async (req, res) => {
  try {
    const userUnits = await Unit.find({
      $or: [{ owner: req.user._id }, { tenant: req.user._id }, { _id: req.user.unit }],
    }).select("_id");

    const unitIds = userUnits.map((u) => u._id);

    const invoices = await Invoice.find({ unit: { $in: unitIds } })
      .populate({
        path: "unit",
        select: "unitNumber floor type building",
        populate: { path: "building", select: "name code" },
      })
      .populate("meter", "meterNumber type status")
      .populate("tariff", "name fixedCharge taxPercentage")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: invoices.length,
      invoices,
    });
  } catch (error) {
    console.error("Error fetching my invoices:", error);
    return res.status(500).json({ message: "Failed to fetch invoices" });
  }
};

// @desc    Get invoice by ID
// @route   GET /api/invoices/:id
// @access  Private
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid invoice ID format" });
    }

    const invoice = await Invoice.findById(id)
      .populate({
        path: "unit",
        select: "unitNumber floor type building owner tenant",
        populate: [
          {
            path: "building",
            select: "name code organization",
            populate: { path: "organization", select: "name status" },
          },
          { path: "owner", select: "name email" },
          { path: "tenant", select: "name email" },
        ],
      })
      .populate("meter", "meterNumber type status lastReading")
      .populate("tariff", "name slabs fixedCharge taxPercentage");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // RBAC validation
    if (req.user.role === "UNIT_USER") {
      const isOwner = invoice.unit?.owner?._id?.toString() === req.user._id.toString();
      const isTenant = invoice.unit?.tenant?._id?.toString() === req.user._id.toString();
      const isAssigned = req.user.unit && req.user.unit.toString() === invoice.unit?._id?.toString();

      if (!isOwner && !isTenant && !isAssigned) {
        return res.status(403).json({
          message: "You are not authorized to view this invoice",
        });
      }
    } else if (req.user.role === "FACILITY_MANAGER" && req.user.organization) {
      const orgId = invoice.unit?.building?.organization?._id?.toString() || invoice.unit?.building?.organization?.toString();
      if (orgId !== req.user.organization.toString()) {
        return res.status(403).json({
          message: "You are not authorized to access invoices outside your organization",
        });
      }
    } else if (req.user.role === "TECHNICIAN") {
      return res.status(403).json({
        message: "Technicians do not have access to invoice financial records",
      });
    }

    return res.status(200).json({ invoice });
  } catch (error) {
    console.error("Error fetching invoice details:", error);
    return res.status(500).json({ message: "Failed to fetch invoice details" });
  }
};

// @desc    Update invoice status or details
// @route   PUT /api/invoices/:id
// @access  Private (PLATFORM_ADMIN, FACILITY_MANAGER, FINANCE_OFFICER)
const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, dueDate } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid invoice ID format" });
    }

    const invoice = await Invoice.findById(id).populate({
      path: "unit",
      populate: { path: "building", select: "organization" },
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Facility Manager org check
    if (req.user.role === "FACILITY_MANAGER" && req.user.organization) {
      const orgId = invoice.unit?.building?.organization?.toString();
      if (orgId !== req.user.organization.toString()) {
        return res.status(403).json({
          message: "You cannot update invoices outside your organization",
        });
      }
    }

    if (status) {
      const validStatuses = ["GENERATED", "PENDING", "PAID", "OVERDUE", "CANCELLED"];
      const upperStatus = status.toUpperCase();
      if (!validStatuses.includes(upperStatus)) {
        return res.status(400).json({ message: `Invalid invoice status: ${status}` });
      }

      // If invoice is already PAID, cannot cancel or revert without proper refund workflow
      if (invoice.status === "PAID" && upperStatus === "CANCELLED") {
        return res.status(400).json({
          message: "Cannot cancel an already paid invoice. Please process a refund first.",
        });
      }

      invoice.status = upperStatus;
      if (upperStatus === "PAID" && !invoice.paidAt) {
        invoice.paidAt = new Date();
      }
    }

    if (notes !== undefined) {
      invoice.notes = notes.trim();
    }

    if (dueDate) {
      const parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({ message: "Invalid due date format" });
      }
      invoice.dueDate = parsedDueDate;
    }

    await invoice.save();

    return res.status(200).json({
      message: "Invoice updated successfully",
      invoice,
    });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return res.status(500).json({ message: "Failed to update invoice" });
  }
};

module.exports = {
  generateInvoice,
  getInvoices,
  getMyInvoices,
  getInvoiceById,
  updateInvoice,
};
