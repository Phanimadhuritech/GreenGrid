const mongoose = require("mongoose");
const Meter = require("../models/Meter");
const Unit = require("../models/Unit");
const Building = require("../models/Building");

// Helper to check if a user is authorized for a specific unit's organization
const isUserAuthorizedForUnit = (user, unitDoc) => {
  if (user.role === "PLATFORM_ADMIN") return true;
  if (user.role === "FACILITY_MANAGER") {
    if (!user.organization) return true;
    const unitOrgId =
      unitDoc.building?.organization?._id?.toString() ||
      unitDoc.building?.organization?.toString();
    return unitOrgId === user.organization.toString();
  }
  return false;
};

// @desc    Get all meters
// @route   GET /api/meters
// @access  Private (PLATFORM_ADMIN, FACILITY_MANAGER)
const getMeters = async (req, res) => {
  try {
    const { unit, status } = req.query;
    let filter = {};

    if (unit) {
      if (!mongoose.Types.ObjectId.isValid(unit)) {
        return res.status(400).json({ message: "Invalid unit ID" });
      }
      filter.unit = unit;
    }

    if (status) {
      if (!["ACTIVE", "INACTIVE"].includes(status)) {
        return res.status(400).json({ message: "Invalid status filter" });
      }
      filter.status = status;
    }

    // Facility Manager organization-level isolation
    if (req.user.role === "FACILITY_MANAGER" && req.user.organization) {
      const managerBuildings = await Building.find({
        organization: req.user.organization,
      }).select("_id");
      const managerBuildingIds = managerBuildings.map((b) => b._id);

      const managerUnits = await Unit.find({
        building: { $in: managerBuildingIds },
      }).select("_id");
      const managerUnitIds = managerUnits.map((u) => u._id.toString());

      if (filter.unit) {
        if (!managerUnitIds.includes(filter.unit.toString())) {
          return res.status(200).json({ count: 0, meters: [] });
        }
      } else {
        filter.unit = { $in: managerUnits.map((u) => u._id) };
      }
    }

    const meters = await Meter.find(filter)
      .populate({
        path: "unit",
        select: "unitNumber floor type status building",
        populate: {
          path: "building",
          select: "name code organization",
          populate: {
            path: "organization",
            select: "name status",
          },
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: meters.length,
      meters,
    });
  } catch (error) {
    console.error("Get meters error:", error.message);
    res.status(500).json({ message: "Failed to fetch meters" });
  }
};

// @desc    Get meter by ID
// @route   GET /api/meters/:id
// @access  Private (PLATFORM_ADMIN, FACILITY_MANAGER)
const getMeterById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid meter ID" });
    }

    const meter = await Meter.findById(id).populate({
      path: "unit",
      select: "unitNumber floor type status building",
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

    // Resource check for FACILITY_MANAGER
    if (!isUserAuthorizedForUnit(req.user, meter.unit)) {
      return res.status(403).json({
        message: "You are not authorized to manage meters for this organization",
      });
    }

    res.status(200).json({
      meter,
    });
  } catch (error) {
    console.error("Get meter by ID error:", error.message);
    res.status(500).json({ message: "Failed to fetch meter" });
  }
};

// @desc    Get meters by Unit
// @route   GET /api/meters/unit/:unitId
// @access  Private (PLATFORM_ADMIN, FACILITY_MANAGER)
const getMetersByUnit = async (req, res) => {
  try {
    const { unitId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(unitId)) {
      return res.status(400).json({ message: "Invalid unit ID" });
    }

    const unitDoc = await Unit.findById(unitId).populate({
      path: "building",
      select: "name code organization",
      populate: {
        path: "organization",
        select: "name status",
      },
    });

    if (!unitDoc) {
      return res.status(400).json({ message: "Invalid unit ID" });
    }

    // Resource check for FACILITY_MANAGER
    if (!isUserAuthorizedForUnit(req.user, unitDoc)) {
      return res.status(403).json({
        message: "You are not authorized to manage meters for this organization",
      });
    }

    const meters = await Meter.find({ unit: unitId })
      .populate({
        path: "unit",
        select: "unitNumber floor type status building",
        populate: {
          path: "building",
          select: "name code organization",
          populate: {
            path: "organization",
            select: "name status",
          },
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: meters.length,
      meters,
    });
  } catch (error) {
    console.error("Get meters by unit error:", error.message);
    res.status(500).json({ message: "Failed to fetch meters for unit" });
  }
};

// @desc    Create new meter
// @route   POST /api/meters
// @access  Private (PLATFORM_ADMIN, FACILITY_MANAGER)
const createMeter = async (req, res) => {
  try {
    const {
      unit,
      meterNumber,
      meterType = "ELECTRICITY",
      installationDate,
      status = "ACTIVE",
      lastReading = 0,
    } = req.body;

    // Validate unit ID
    if (!unit || !mongoose.Types.ObjectId.isValid(unit)) {
      return res.status(400).json({ message: "Invalid unit ID" });
    }

    // Validate meter number
    if (!meterNumber || !meterNumber.trim()) {
      return res.status(400).json({ message: "Meter number is required" });
    }

    // Validate meterType
    if (meterType && meterType !== "ELECTRICITY") {
      return res.status(400).json({
        message: "Invalid meter type. Only ELECTRICITY is supported.",
      });
    }

    // Validate status
    if (status && !["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Must be ACTIVE or INACTIVE.",
      });
    }

    // Validate lastReading
    if (lastReading !== undefined && (Number(lastReading) < 0 || isNaN(Number(lastReading)))) {
      return res.status(400).json({
        message: "Last reading cannot be negative",
      });
    }

    // Verify unit existence and resolve hierarchy
    const unitDoc = await Unit.findById(unit).populate({
      path: "building",
      select: "name code organization",
      populate: {
        path: "organization",
        select: "name status",
      },
    });

    if (!unitDoc) {
      return res.status(400).json({ message: "Invalid unit ID" });
    }

    // Resource check for FACILITY_MANAGER
    if (!isUserAuthorizedForUnit(req.user, unitDoc)) {
      return res.status(403).json({
        message: "You are not authorized to manage meters for this organization",
      });
    }

    // Prevent duplicate meter number
    const existingMeterNumber = await Meter.findOne({
      meterNumber: meterNumber.trim(),
    });

    if (existingMeterNumber) {
      return res.status(400).json({ message: "Meter number already exists" });
    }

    // Prevent multiple ACTIVE meters for the same Unit
    if (status === "ACTIVE") {
      const activeMeterForUnit = await Meter.findOne({
        unit: unitDoc._id,
        status: "ACTIVE",
      });

      if (activeMeterForUnit) {
        return res.status(400).json({
          message: "Unit already has an active meter",
        });
      }
    }

    const meter = await Meter.create({
      unit: unitDoc._id,
      meterNumber: meterNumber.trim(),
      meterType: meterType || "ELECTRICITY",
      installationDate: installationDate ? new Date(installationDate) : new Date(),
      status: status || "ACTIVE",
      lastReading: lastReading !== undefined ? Number(lastReading) : 0,
    });

    const populatedMeter = await Meter.findById(meter._id).populate({
      path: "unit",
      select: "unitNumber floor type status building",
      populate: {
        path: "building",
        select: "name code organization",
        populate: {
          path: "organization",
          select: "name status",
        },
      },
    });

    res.status(201).json({
      message: "Meter created successfully",
      meter: populatedMeter,
    });
  } catch (error) {
    console.error("Create meter error:", error.message);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Meter number already exists" });
    }
    res.status(500).json({ message: "Failed to create meter" });
  }
};

// @desc    Update meter
// @route   PUT /api/meters/:id
// @access  Private (PLATFORM_ADMIN, FACILITY_MANAGER)
const updateMeter = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid meter ID" });
    }

    const meter = await Meter.findById(id).populate({
      path: "unit",
      select: "unitNumber floor type status building",
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

    // Resource check for FACILITY_MANAGER
    if (!isUserAuthorizedForUnit(req.user, meter.unit)) {
      return res.status(403).json({
        message: "You are not authorized to manage meters for this organization",
      });
    }

    const {
      unit,
      meterNumber,
      meterType,
      installationDate,
      status,
      lastReading,
    } = req.body;

    const targetUnitId = unit || meter.unit._id;

    // If unit is changed, validate the new unit
    if (unit && unit.toString() !== meter.unit._id.toString()) {
      if (!mongoose.Types.ObjectId.isValid(unit)) {
        return res.status(400).json({ message: "Invalid unit ID" });
      }

      const targetUnitDoc = await Unit.findById(unit).populate({
        path: "building",
        select: "name code organization",
        populate: {
          path: "organization",
          select: "name status",
        },
      });

      if (!targetUnitDoc) {
        return res.status(400).json({ message: "Invalid unit ID" });
      }

      if (!isUserAuthorizedForUnit(req.user, targetUnitDoc)) {
        return res.status(403).json({
          message: "You are not authorized to manage meters for this organization",
        });
      }

      meter.unit = targetUnitDoc._id;
    }

    // If meterNumber is updated, check duplicate
    if (meterNumber && meterNumber.trim() !== meter.meterNumber) {
      const duplicateMeter = await Meter.findOne({
        _id: { $ne: id },
        meterNumber: meterNumber.trim(),
      });

      if (duplicateMeter) {
        return res.status(400).json({ message: "Meter number already exists" });
      }

      meter.meterNumber = meterNumber.trim();
    }

    // If status is updated
    if (status !== undefined) {
      if (!["ACTIVE", "INACTIVE"].includes(status)) {
        return res.status(400).json({
          message: "Invalid status. Must be ACTIVE or INACTIVE.",
        });
      }

      if (status === "ACTIVE" && meter.status !== "ACTIVE") {
        const activeMeterForUnit = await Meter.findOne({
          _id: { $ne: id },
          unit: targetUnitId,
          status: "ACTIVE",
        });

        if (activeMeterForUnit) {
          return res.status(400).json({
            message: "Unit already has an active meter",
          });
        }
      }

      meter.status = status;
    }

    // If meterType is updated
    if (meterType !== undefined) {
      if (meterType !== "ELECTRICITY") {
        return res.status(400).json({
          message: "Invalid meter type. Only ELECTRICITY is supported.",
        });
      }
      meter.meterType = meterType;
    }

    // If lastReading is updated
    if (lastReading !== undefined) {
      if (Number(lastReading) < 0 || isNaN(Number(lastReading))) {
        return res.status(400).json({
          message: "Last reading cannot be negative",
        });
      }
      meter.lastReading = Number(lastReading);
    }

    if (installationDate !== undefined) {
      meter.installationDate = installationDate ? new Date(installationDate) : meter.installationDate;
    }

    await meter.save();

    const populatedMeter = await Meter.findById(meter._id).populate({
      path: "unit",
      select: "unitNumber floor type status building",
      populate: {
        path: "building",
        select: "name code organization",
        populate: {
          path: "organization",
          select: "name status",
        },
      },
    });

    res.status(200).json({
      message: "Meter updated successfully",
      meter: populatedMeter,
    });
  } catch (error) {
    console.error("Update meter error:", error.message);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Meter number already exists" });
    }
    res.status(500).json({ message: "Failed to update meter" });
  }
};

// @desc    Delete meter
// @route   DELETE /api/meters/:id
// @access  Private (PLATFORM_ADMIN, FACILITY_MANAGER)
const deleteMeter = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid meter ID" });
    }

    const meter = await Meter.findById(id).populate({
      path: "unit",
      select: "unitNumber floor type status building",
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

    // Resource check for FACILITY_MANAGER
    if (!isUserAuthorizedForUnit(req.user, meter.unit)) {
      return res.status(403).json({
        message: "You are not authorized to manage meters for this organization",
      });
    }

    await Meter.findByIdAndDelete(id);

    res.status(200).json({
      message: "Meter deleted successfully",
    });
  } catch (error) {
    console.error("Delete meter error:", error.message);
    res.status(500).json({ message: "Failed to delete meter" });
  }
};

module.exports = {
  getMeters,
  getMeterById,
  getMetersByUnit,
  createMeter,
  updateMeter,
  deleteMeter,
};
