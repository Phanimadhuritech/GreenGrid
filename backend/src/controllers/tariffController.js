const Tariff = require("../models/Tariff");
const { validateTariffData } = require("../services/billingService");

/**
 * @desc    Get all tariffs
 * @route   GET /api/tariffs
 * @access  Private (PLATFORM_ADMIN, FACILITY_MANAGER)
 */
const getTariffs = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) {
      filter.status = status;
    }

    const tariffs = await Tariff.find(filter).sort({ effectiveFrom: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: tariffs.length,
      tariffs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch tariffs",
    });
  }
};

/**
 * @desc    Get single tariff by ID
 * @route   GET /api/tariffs/:id
 * @access  Private (PLATFORM_ADMIN, FACILITY_MANAGER)
 */
const getTariffById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tariff ID format",
      });
    }

    const tariff = await Tariff.findById(id);
    if (!tariff) {
      return res.status(404).json({
        success: false,
        message: "Tariff not found",
      });
    }

    return res.status(200).json({
      success: true,
      tariff,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch tariff",
    });
  }
};

/**
 * @desc    Create a new tariff
 * @route   POST /api/tariffs
 * @access  Private (PLATFORM_ADMIN)
 */
const createTariff = async (req, res) => {
  try {
    const validation = validateTariffData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const {
      name,
      slabs,
      fixedCharge = 0,
      taxPercentage = 0,
      adjustments = 0,
      effectiveFrom,
      effectiveTo = null,
      status = "ACTIVE",
    } = req.body;

    const tariff = await Tariff.create({
      name: name.trim(),
      slabs: slabs.map((s) => ({
        from: Number(s.from),
        to: s.to !== null && s.to !== undefined && s.to !== "" ? Number(s.to) : null,
        rate: Number(s.rate),
      })),
      fixedCharge: Number(fixedCharge) || 0,
      taxPercentage: Number(taxPercentage) || 0,
      adjustments: Number(adjustments) || 0,
      effectiveFrom: new Date(effectiveFrom),
      effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      status: status || "ACTIVE",
    });

    return res.status(201).json({
      success: true,
      message: "Tariff created successfully",
      tariff,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create tariff",
    });
  }
};

/**
 * @desc    Update an existing tariff
 * @route   PUT /api/tariffs/:id
 * @access  Private (PLATFORM_ADMIN)
 */
const updateTariff = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tariff ID format",
      });
    }

    const existingTariff = await Tariff.findById(id);
    if (!existingTariff) {
      return res.status(404).json({
        success: false,
        message: "Tariff not found",
      });
    }

    const validation = validateTariffData({
      ...existingTariff.toObject(),
      ...req.body,
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const {
      name,
      slabs,
      fixedCharge,
      taxPercentage,
      adjustments,
      effectiveFrom,
      effectiveTo,
      status,
    } = req.body;

    if (name !== undefined) existingTariff.name = name.trim();
    if (slabs !== undefined) {
      existingTariff.slabs = slabs.map((s) => ({
        from: Number(s.from),
        to: s.to !== null && s.to !== undefined && s.to !== "" ? Number(s.to) : null,
        rate: Number(s.rate),
      }));
    }
    if (fixedCharge !== undefined) existingTariff.fixedCharge = Number(fixedCharge);
    if (taxPercentage !== undefined) existingTariff.taxPercentage = Number(taxPercentage);
    if (adjustments !== undefined) existingTariff.adjustments = Number(adjustments);
    if (effectiveFrom !== undefined) existingTariff.effectiveFrom = new Date(effectiveFrom);
    if (effectiveTo !== undefined) existingTariff.effectiveTo = effectiveTo ? new Date(effectiveTo) : null;
    if (status !== undefined) existingTariff.status = status;

    await existingTariff.save();

    return res.status(200).json({
      success: true,
      message: "Tariff updated successfully",
      tariff: existingTariff,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update tariff",
    });
  }
};

/**
 * @desc    Delete a tariff
 * @route   DELETE /api/tariffs/:id
 * @access  Private (PLATFORM_ADMIN)
 */
const deleteTariff = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tariff ID format",
      });
    }

    const tariff = await Tariff.findById(id);
    if (!tariff) {
      return res.status(404).json({
        success: false,
        message: "Tariff not found",
      });
    }

    await Tariff.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Tariff deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete tariff",
    });
  }
};

module.exports = {
  getTariffs,
  getTariffById,
  createTariff,
  updateTariff,
  deleteTariff,
};
