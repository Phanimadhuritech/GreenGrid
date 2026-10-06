const mongoose = require("mongoose");
const Meter = require("../models/Meter");
const Unit = require("../models/Unit");
const Building = require("../models/Building");
const {
  getMeterConsumptionData,
  getUnitConsumptionData,
  getBuildingConsumptionData,
} = require("../services/consumptionService");

// @desc    Get consumption for a single meter
// @route   GET /api/consumption/meter/:meterId
// @access  Private
const getMeterConsumption = async (req, res) => {
  try {
    const { meterId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(meterId)) {
      return res.status(400).json({ message: "Invalid meter ID" });
    }

    const meter = await Meter.findById(meterId).populate({
      path: "unit",
      select: "unitNumber floor building owner tenant",
      populate: {
        path: "building",
        select: "name code organization",
        populate: {
          path: "organization",
          select: "name status",
        },
      },
    });

    if (!meter) {
      return res.status(404).json({ message: "Meter not found" });
    }

    // Role checks
    if (req.user.role === "FACILITY_MANAGER" && req.user.organization) {
      const orgId = meter.unit?.building?.organization?._id?.toString() || meter.unit?.building?.organization?.toString();
      if (orgId !== req.user.organization.toString()) {
        return res.status(403).json({
          message: "You are not authorized to view consumption for this organization",
        });
      }
    } else if (req.user.role === "UNIT_USER") {
      const ownerId = meter.unit?.owner?.toString() || meter.unit?.owner?._id?.toString();
      const tenantId = meter.unit?.tenant?.toString() || meter.unit?.tenant?._id?.toString();
      const userId = req.user._id.toString();
      if (ownerId !== userId && tenantId !== userId) {
        return res.status(403).json({
          message: "You are not authorized to view consumption for this unit",
        });
      }
    }

    const data = await getMeterConsumptionData(meterId);

    res.status(200).json(data);
  } catch (error) {
    console.error("Get meter consumption error:", error.message);
    res.status(500).json({ message: "Failed to calculate meter consumption" });
  }
};

// @desc    Get consumption for a unit
// @route   GET /api/consumption/unit/:unitId
// @access  Private
const getUnitConsumption = async (req, res) => {
  try {
    const { unitId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(unitId)) {
      return res.status(400).json({ message: "Invalid unit ID" });
    }

    const unit = await Unit.findById(unitId).populate({
      path: "building",
      select: "name code organization",
      populate: {
        path: "organization",
        select: "name status",
      },
    });

    if (!unit) {
      return res.status(404).json({ message: "Unit not found" });
    }

    // Role checks
    if (req.user.role === "FACILITY_MANAGER" && req.user.organization) {
      const orgId = unit.building?.organization?._id?.toString() || unit.building?.organization?.toString();
      if (orgId !== req.user.organization.toString()) {
        return res.status(403).json({
          message: "You are not authorized to view consumption for this organization",
        });
      }
    } else if (req.user.role === "UNIT_USER") {
      const ownerId = unit.owner?.toString() || unit.owner?._id?.toString();
      const tenantId = unit.tenant?.toString() || unit.tenant?._id?.toString();
      const userId = req.user._id.toString();
      if (ownerId !== userId && tenantId !== userId) {
        return res.status(403).json({
          message: "You are not authorized to view consumption for this unit",
        });
      }
    }

    const data = await getUnitConsumptionData(unitId);

    res.status(200).json(data);
  } catch (error) {
    console.error("Get unit consumption error:", error.message);
    res.status(500).json({ message: "Failed to calculate unit consumption" });
  }
};

// @desc    Get aggregated consumption for a building
// @route   GET /api/consumption/building/:buildingId
// @access  Private (PLATFORM_ADMIN, FACILITY_MANAGER)
const getBuildingConsumption = async (req, res) => {
  try {
    const { buildingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(buildingId)) {
      return res.status(400).json({ message: "Invalid building ID" });
    }

    const building = await Building.findById(buildingId).populate("organization");

    if (!building) {
      return res.status(404).json({ message: "Building not found" });
    }

    // Role check
    if (req.user.role === "FACILITY_MANAGER" && req.user.organization) {
      const orgId = building.organization?._id?.toString() || building.organization?.toString();
      if (orgId !== req.user.organization.toString()) {
        return res.status(403).json({
          message: "You are not authorized to view consumption for this organization",
        });
      }
    } else if (req.user.role === "UNIT_USER") {
      return res.status(403).json({
        message: "You are not authorized to view building aggregate consumption",
      });
    }

    const data = await getBuildingConsumptionData(buildingId);

    res.status(200).json(data);
  } catch (error) {
    console.error("Get building consumption error:", error.message);
    res.status(500).json({ message: "Failed to calculate building consumption" });
  }
};

module.exports = {
  getMeterConsumption,
  getUnitConsumption,
  getBuildingConsumption,
};
