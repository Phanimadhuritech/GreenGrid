const mongoose = require("mongoose");
const Building = require("../models/Building");
const Organization = require("../models/Organization");
const Unit = require("../models/Unit");

// @desc    Get all buildings
// @route   GET /api/buildings
// @access  Private
const getBuildings = async (req, res) => {
  try {
    const { organization } = req.query;
    let filter = {};

    if (organization) {
      if (!mongoose.Types.ObjectId.isValid(organization)) {
        return res.status(400).json({
          message: "Invalid organization ID in query",
        });
      }
      filter.organization = organization;
    }

    // FACILITY_MANAGER isolation if assigned to an organization
    if (req.user.role === "FACILITY_MANAGER" && req.user.organization) {
      const userOrgId = req.user.organization?._id || req.user.organization;
      filter.organization = userOrgId;
    }

    const buildings = await Building.find(filter)
      .populate("organization", "name status address contactEmail")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: buildings.length,
      buildings,
    });
  } catch (error) {
    console.error("Get buildings error:", error.message);
    res.status(500).json({
      message: "Failed to fetch buildings",
    });
  }
};

// @desc    Get building by ID
// @route   GET /api/buildings/:id
// @access  Private
const getBuildingById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid building ID",
      });
    }

    const building = await Building.findById(id).populate(
      "organization",
      "name status address contactEmail"
    );

    if (!building) {
      return res.status(404).json({
        message: "Building not found",
      });
    }

    // Resource check for FACILITY_MANAGER
    if (
      req.user.role === "FACILITY_MANAGER" &&
      req.user.organization &&
      building.organization &&
      req.user.organization.toString() !== building.organization._id.toString()
    ) {
      return res.status(403).json({
        message: "You are not authorized to view this building",
      });
    }

    res.status(200).json({
      building,
    });
  } catch (error) {
    console.error("Get building by ID error:", error.message);
    res.status(500).json({
      message: "Failed to fetch building",
    });
  }
};

// @desc    Create new building
// @route   POST /api/buildings
// @access  Private (PLATFORM_ADMIN, FACILITY_MANAGER)
const createBuilding = async (req, res) => {
  try {
    let { organization, name, code, address, numberOfFloors, status } =
      req.body;

    // If organization not in body, default to user's assigned organization
    if (!organization && req.user.organization) {
      organization = req.user.organization?._id || req.user.organization;
    }

    if (!organization || !name || !code) {
      return res.status(400).json({
        message: "Organization, building name, and code are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(organization)) {
      return res.status(400).json({
        message: "Invalid organization ID",
      });
    }

    // Verify referenced organization exists
    const orgExists = await Organization.findById(organization);
    if (!orgExists) {
      return res.status(404).json({
        message: "Referenced organization not found",
      });
    }

    // Resource check for FACILITY_MANAGER
    if (
      req.user.role === "FACILITY_MANAGER" &&
      req.user.organization &&
      req.user.organization.toString() !== organization.toString()
    ) {
      return res.status(403).json({
        message: "You are not authorized to create buildings for this organization",
      });
    }

    // If FACILITY_MANAGER is unassigned, auto-assign this organization to their profile
    if (req.user.role === "FACILITY_MANAGER" && !req.user.organization) {
      req.user.organization = organization;
      await req.user.save();
    }

    // Check duplicate building code within organization
    const existingBuilding = await Building.findOne({
      organization,
      code: code.trim().toUpperCase(),
    });

    if (existingBuilding) {
      return res.status(409).json({
        message: "Building with this code already exists in this organization",
      });
    }

    const building = await Building.create({
      organization,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      address: address ? address.trim() : "",
      numberOfFloors: numberOfFloors ? Number(numberOfFloors) : 1,
      status: status || "ACTIVE",
    });

    const populatedBuilding = await Building.findById(building._id).populate(
      "organization",
      "name status address"
    );

    res.status(201).json({
      message: "Building created successfully",
      building: populatedBuilding,
    });
  } catch (error) {
    console.error("Create building error:", error.message);
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Building with this code already exists in this organization",
      });
    }
    res.status(500).json({
      message: "Failed to create building",
    });
  }
};

// @desc    Update building
// @route   PUT /api/buildings/:id
// @access  Private (PLATFORM_ADMIN, FACILITY_MANAGER)
const updateBuilding = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid building ID",
      });
    }

    const building = await Building.findById(id);

    if (!building) {
      return res.status(404).json({
        message: "Building not found",
      });
    }

    // Resource check for FACILITY_MANAGER
    if (
      req.user.role === "FACILITY_MANAGER" &&
      req.user.organization &&
      req.user.organization.toString() !== building.organization.toString()
    ) {
      return res.status(403).json({
        message: "You are not authorized to update this building",
      });
    }

    const { organization, name, code, address, numberOfFloors, status } =
      req.body;

    const targetOrg = organization || building.organization;
    const targetCode = code ? code.trim().toUpperCase() : building.code;

    // If code or organization is changing, check for duplicate
    if (
      (code && targetCode !== building.code) ||
      (organization && targetOrg.toString() !== building.organization.toString())
    ) {
      if (organization) {
        if (!mongoose.Types.ObjectId.isValid(organization)) {
          return res.status(400).json({
            message: "Invalid organization ID",
          });
        }
        const orgExists = await Organization.findById(organization);
        if (!orgExists) {
          return res.status(404).json({
            message: "Referenced organization not found",
          });
        }
      }

      const duplicate = await Building.findOne({
        _id: { $ne: id },
        organization: targetOrg,
        code: targetCode,
      });

      if (duplicate) {
        return res.status(409).json({
          message: "Building with this code already exists in this organization",
        });
      }
    }

    if (organization) building.organization = organization;
    if (name !== undefined) building.name = name.trim();
    if (code !== undefined) building.code = code.trim().toUpperCase();
    if (address !== undefined) building.address = address.trim();
    if (numberOfFloors !== undefined)
      building.numberOfFloors = Number(numberOfFloors);
    if (status !== undefined) building.status = status;

    await building.save();

    const populatedBuilding = await Building.findById(building._id).populate(
      "organization",
      "name status address"
    );

    res.status(200).json({
      message: "Building updated successfully",
      building: populatedBuilding,
    });
  } catch (error) {
    console.error("Update building error:", error.message);
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Building with this code already exists in this organization",
      });
    }
    res.status(500).json({
      message: "Failed to update building",
    });
  }
};

// @desc    Delete building
// @route   DELETE /api/buildings/:id
// @access  Private (PLATFORM_ADMIN, FACILITY_MANAGER)
const deleteBuilding = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid building ID",
      });
    }

    const building = await Building.findById(id);

    if (!building) {
      return res.status(404).json({
        message: "Building not found",
      });
    }

    // Resource check for FACILITY_MANAGER
    if (
      req.user.role === "FACILITY_MANAGER" &&
      req.user.organization &&
      req.user.organization.toString() !== building.organization.toString()
    ) {
      return res.status(403).json({
        message: "You are not authorized to delete this building",
      });
    }

    // Cascade delete units in this building
    await Unit.deleteMany({ building: id });
    await Building.findByIdAndDelete(id);

    res.status(200).json({
      message: "Building and associated units deleted successfully",
    });
  } catch (error) {
    console.error("Delete building error:", error.message);
    res.status(500).json({
      message: "Failed to delete building",
    });
  }
};

module.exports = {
  getBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding,
};
