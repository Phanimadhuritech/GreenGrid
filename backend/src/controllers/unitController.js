const mongoose = require("mongoose");
const Unit = require("../models/Unit");
const Building = require("../models/Building");

// Helper to extract safe string ID from ObjectId or populated Document
const toIdString = (val) => {
  if (!val) return null;
  if (typeof val === "object" && val._id) return val._id.toString();
  return val.toString();
};

// @desc    Get all units
// @route   GET /api/units
// @access  Private
const getUnits = async (req, res) => {
  try {
    const { building, organization } = req.query;
    let filter = {};

    if (building) {
      if (!mongoose.Types.ObjectId.isValid(building)) {
        return res.status(400).json({
          message: "Invalid building ID in query",
        });
      }
      filter.building = building;
    }

    if (organization && !building) {
      if (!mongoose.Types.ObjectId.isValid(organization)) {
        return res.status(400).json({
          message: "Invalid organization ID in query",
        });
      }
      const orgBuildings = await Building.find({ organization }).select("_id");
      filter.building = { $in: orgBuildings.map((b) => b._id) };
    }

    // Role-based resource filtering
    if (req.user.role === "UNIT_USER") {
      // Residents / unit users only see units they own or occupy
      filter.$or = [{ owner: req.user._id }, { tenant: req.user._id }];
    } else if (req.user.role === "FACILITY_MANAGER" && req.user.organization) {
      const userOrgId = req.user.organization?._id || req.user.organization;
      const managerBuildings = await Building.find({
        organization: userOrgId,
      }).select("_id");
      const managerBuildingIds = managerBuildings.map((b) => b._id.toString());

      if (filter.building) {
        if (
          !managerBuildingIds.includes(
            filter.building.$in
              ? filter.building.$in.map((id) => id.toString())
              : filter.building.toString()
          )
        ) {
          return res.status(200).json({ count: 0, units: [] });
        }
      } else {
        filter.building = { $in: managerBuildings.map((b) => b._id) };
      }
    }

    const units = await Unit.find(filter)
      .populate({
        path: "building",
        select: "name code organization numberOfFloors",
        populate: {
          path: "organization",
          select: "name status",
        },
      })
      .populate("owner", "name email")
      .populate("tenant", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: units.length,
      units,
    });
  } catch (error) {
    console.error("Get units error:", error.message);
    res.status(500).json({
      message: "Failed to fetch units",
    });
  }
};

// @desc    Get unit by ID
// @route   GET /api/units/:id
// @access  Private
const getUnitById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid unit ID",
      });
    }

    const unit = await Unit.findById(id)
      .populate({
        path: "building",
        select: "name code organization numberOfFloors",
        populate: {
          path: "organization",
          select: "name status",
        },
      })
      .populate("owner", "name email")
      .populate("tenant", "name email");

    if (!unit) {
      return res.status(404).json({
        message: "Unit not found",
      });
    }

    // Role-based resource authorization
    if (req.user.role === "UNIT_USER") {
      const isOwner =
        unit.owner && unit.owner._id.toString() === req.user._id.toString();
      const isTenant =
        unit.tenant && unit.tenant._id.toString() === req.user._id.toString();

      if (!isOwner && !isTenant) {
        return res.status(403).json({
          message: "You are not authorized to view this unit",
        });
      }
    } else if (req.user.role === "FACILITY_MANAGER") {
      const userOrgId = toIdString(req.user.organization);
      const unitOrgId = toIdString(unit.building?.organization);

      if (!userOrgId || !unitOrgId || userOrgId !== unitOrgId) {
        return res.status(403).json({
          message: "You are not authorized to view units in this organization",
        });
      }
    }

    res.status(200).json({
      unit,
    });
  } catch (error) {
    console.error("Get unit by ID error:", error.message);
    res.status(500).json({
      message: "Failed to fetch unit",
    });
  }
};

// @desc    Create new unit
// @route   POST /api/units
// @access  Private (PLATFORM_ADMIN, FACILITY_MANAGER)
const createUnit = async (req, res) => {
  try {
    const { building, unitNumber, floor, type, owner, tenant, status } =
      req.body;

    if (!building || !unitNumber) {
      return res.status(400).json({
        message: "Building and unit number are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(building)) {
      return res.status(400).json({
        message: "Invalid building ID format",
      });
    }

    // Verify referenced building exists
    const buildingExists = await Building.findById(building).populate(
      "organization"
    );

    if (!buildingExists) {
      return res.status(404).json({
        message: "Referenced building not found",
      });
    }

    // Resource check for FACILITY_MANAGER
    if (req.user.role === "FACILITY_MANAGER") {
      const userOrgId = toIdString(req.user.organization);
      const buildingOrgId = toIdString(buildingExists.organization);

      if (!userOrgId || !buildingOrgId || userOrgId !== buildingOrgId) {
        return res.status(403).json({
          message:
            "You are not authorized to create units in this building's organization",
        });
      }
    }

    // Check duplicate unit number within building
    const existingUnit = await Unit.findOne({
      building,
      unitNumber: unitNumber.trim(),
    });

    if (existingUnit) {
      return res.status(409).json({
        message: `Unit "${unitNumber.trim()}" already exists in this building`,
      });
    }

    // Validate floor
    const parsedFloor = floor !== undefined && !isNaN(Number(floor)) ? Number(floor) : 1;
    if (parsedFloor < 0) {
      return res.status(400).json({ message: "Floor number cannot be negative" });
    }

    // Validate owner/tenant if provided
    if (owner && !mongoose.Types.ObjectId.isValid(owner)) {
      return res.status(400).json({ message: "Invalid owner user ID" });
    }
    if (tenant && !mongoose.Types.ObjectId.isValid(tenant)) {
      return res.status(400).json({ message: "Invalid tenant user ID" });
    }

    const validTypes = ["APARTMENT", "OFFICE", "SHOP", "OTHER"];
    const normalizedType = type ? type.toUpperCase() : "APARTMENT";
    if (!validTypes.includes(normalizedType)) {
      return res.status(400).json({
        message: `Invalid unit type. Allowed types: ${validTypes.join(", ")}`,
      });
    }

    const validStatuses = ["OCCUPIED", "VACANT", "INACTIVE"];
    const normalizedStatus = status ? status.toUpperCase() : "VACANT";
    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        message: `Invalid status. Allowed statuses: ${validStatuses.join(", ")}`,
      });
    }

    const unit = await Unit.create({
      building,
      unitNumber: unitNumber.trim(),
      floor: parsedFloor,
      type: normalizedType,
      owner: owner || null,
      tenant: tenant || null,
      status: normalizedStatus,
    });

    const populatedUnit = await Unit.findById(unit._id)
      .populate({
        path: "building",
        select: "name code organization",
        populate: {
          path: "organization",
          select: "name",
        },
      })
      .populate("owner", "name email")
      .populate("tenant", "name email");

    res.status(201).json({
      message: "Unit created successfully",
      unit: populatedUnit,
    });
  } catch (error) {
    console.error("Create unit error:", error.message);
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Unit with this number already exists in this building",
      });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }
    res.status(500).json({
      message: "Failed to create unit: " + (error.message || "Internal server error"),
    });
  }
};

// @desc    Update unit
// @route   PUT /api/units/:id
// @access  Private (PLATFORM_ADMIN, FACILITY_MANAGER)
const updateUnit = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid unit ID",
      });
    }

    const unit = await Unit.findById(id).populate("building");

    if (!unit) {
      return res.status(404).json({
        message: "Unit not found",
      });
    }

    // Resource check for FACILITY_MANAGER
    if (req.user.role === "FACILITY_MANAGER") {
      const userOrgId = toIdString(req.user.organization);
      const buildingOrgId = toIdString(unit.building?.organization);

      if (!userOrgId || !buildingOrgId || userOrgId !== buildingOrgId) {
        return res.status(403).json({
          message: "You are not authorized to update this unit",
        });
      }
    }

    const { building, unitNumber, floor, type, owner, tenant, status } =
      req.body;

    const targetBuilding = building || unit.building._id;
    const targetUnitNumber = unitNumber ? unitNumber.trim() : unit.unitNumber;

    // Check duplicate if unitNumber or building changed
    if (
      (unitNumber && targetUnitNumber !== unit.unitNumber) ||
      (building && targetBuilding.toString() !== unit.building._id.toString())
    ) {
      if (building) {
        if (!mongoose.Types.ObjectId.isValid(building)) {
          return res.status(400).json({
            message: "Invalid building ID",
          });
        }
        const buildingExists = await Building.findById(building);
        if (!buildingExists) {
          return res.status(404).json({
            message: "Referenced building not found",
          });
        }
      }

      const duplicate = await Unit.findOne({
        _id: { $ne: id },
        building: targetBuilding,
        unitNumber: targetUnitNumber,
      });

      if (duplicate) {
        return res.status(409).json({
          message: `Unit "${targetUnitNumber}" already exists in this building`,
        });
      }
    }

    if (building) unit.building = building;
    if (unitNumber !== undefined) unit.unitNumber = unitNumber.trim();
    if (floor !== undefined && !isNaN(Number(floor))) unit.floor = Number(floor);
    if (type !== undefined) unit.type = type.toUpperCase();
    if (owner !== undefined) unit.owner = owner || null;
    if (tenant !== undefined) unit.tenant = tenant || null;
    if (status !== undefined) unit.status = status.toUpperCase();

    await unit.save();

    const populatedUnit = await Unit.findById(unit._id)
      .populate({
        path: "building",
        select: "name code organization",
        populate: {
          path: "organization",
          select: "name",
        },
      })
      .populate("owner", "name email")
      .populate("tenant", "name email");

    res.status(200).json({
      message: "Unit updated successfully",
      unit: populatedUnit,
    });
  } catch (error) {
    console.error("Update unit error:", error.message);
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Unit with this number already exists in this building",
      });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }
    res.status(500).json({
      message: "Failed to update unit: " + (error.message || "Internal server error"),
    });
  }
};

// @desc    Delete unit
// @route   DELETE /api/units/:id
// @access  Private (PLATFORM_ADMIN, FACILITY_MANAGER)
const deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid unit ID",
      });
    }

    const unit = await Unit.findById(id).populate("building");

    if (!unit) {
      return res.status(404).json({
        message: "Unit not found",
      });
    }

    // Resource check for FACILITY_MANAGER
    if (req.user.role === "FACILITY_MANAGER") {
      const userOrgId = toIdString(req.user.organization);
      const buildingOrgId = toIdString(unit.building?.organization);

      if (!userOrgId || !buildingOrgId || userOrgId !== buildingOrgId) {
        return res.status(403).json({
          message: "You are not authorized to delete this unit",
        });
      }
    }

    await Unit.findByIdAndDelete(id);

    res.status(200).json({
      message: "Unit deleted successfully",
    });
  } catch (error) {
    console.error("Delete unit error:", error.message);
    res.status(500).json({
      message: "Failed to delete unit: " + (error.message || "Internal server error"),
    });
  }
};

module.exports = {
  getUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
};
