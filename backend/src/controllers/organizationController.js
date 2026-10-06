const mongoose = require("mongoose");
const Organization = require("../models/Organization");
const Building = require("../models/Building");
const Unit = require("../models/Unit");

// @desc    Get all organizations
// @route   GET /api/organizations
// @access  Private
const getOrganizations = async (req, res) => {
  try {
    let filter = {};

    // If FACILITY_MANAGER and assigned to a specific organization, isolate to that org
    if (req.user.role === "FACILITY_MANAGER" && req.user.organization) {
      filter._id = req.user.organization;
    }

    const organizations = await Organization.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: organizations.length,
      organizations,
    });
  } catch (error) {
    console.error("Get organizations error:", error.message);
    res.status(500).json({
      message: "Failed to fetch organizations",
    });
  }
};

// @desc    Get organization by ID
// @route   GET /api/organizations/:id
// @access  Private
const getOrganizationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid organization ID",
      });
    }

    const organization = await Organization.findById(id).populate(
      "createdBy",
      "name email"
    );

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    // Resource check for FACILITY_MANAGER
    if (
      req.user.role === "FACILITY_MANAGER" &&
      req.user.organization &&
      req.user.organization.toString() !== organization._id.toString()
    ) {
      return res.status(403).json({
        message: "You are not authorized to view this organization",
      });
    }

    res.status(200).json({
      organization,
    });
  } catch (error) {
    console.error("Get organization by ID error:", error.message);
    res.status(500).json({
      message: "Failed to fetch organization",
    });
  }
};

// @desc    Create new organization
// @route   POST /api/organizations
// @access  Private (PLATFORM_ADMIN only)
const createOrganization = async (req, res) => {
  try {
    if (req.user.role !== "PLATFORM_ADMIN") {
      return res.status(403).json({
        message: "Only PLATFORM_ADMIN can create organizations",
      });
    }

    const { name, address, contactEmail, contactPhone, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Organization name is required",
      });
    }

    const organization = await Organization.create({
      name: name.trim(),
      address: address ? address.trim() : "",
      contactEmail: contactEmail ? contactEmail.trim().toLowerCase() : "",
      contactPhone: contactPhone ? contactPhone.trim() : "",
      status: status || "ACTIVE",
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: "Organization created successfully",
      organization,
    });
  } catch (error) {
    console.error("Create organization error:", error.message);
    res.status(500).json({
      message: "Failed to create organization",
    });
  }
};

// @desc    Update organization
// @route   PUT /api/organizations/:id
// @access  Private (PLATFORM_ADMIN only)
const updateOrganization = async (req, res) => {
  try {
    if (req.user.role !== "PLATFORM_ADMIN") {
      return res.status(403).json({
        message: "Only PLATFORM_ADMIN can update organizations",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid organization ID",
      });
    }

    const organization = await Organization.findById(id);

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    const { name, address, contactEmail, contactPhone, status } = req.body;

    if (name !== undefined) organization.name = name.trim();
    if (address !== undefined) organization.address = address.trim();
    if (contactEmail !== undefined)
      organization.contactEmail = contactEmail.trim().toLowerCase();
    if (contactPhone !== undefined)
      organization.contactPhone = contactPhone.trim();
    if (status !== undefined) organization.status = status;

    await organization.save();

    res.status(200).json({
      message: "Organization updated successfully",
      organization,
    });
  } catch (error) {
    console.error("Update organization error:", error.message);
    res.status(500).json({
      message: "Failed to update organization",
    });
  }
};

// @desc    Delete organization
// @route   DELETE /api/organizations/:id
// @access  Private (PLATFORM_ADMIN only)
const deleteOrganization = async (req, res) => {
  try {
    if (req.user.role !== "PLATFORM_ADMIN") {
      return res.status(403).json({
        message: "Only PLATFORM_ADMIN can delete organizations",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid organization ID",
      });
    }

    const organization = await Organization.findById(id);

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    // Cascade delete buildings and their units
    const buildings = await Building.find({ organization: id });
    const buildingIds = buildings.map((b) => b._id);

    if (buildingIds.length > 0) {
      await Unit.deleteMany({ building: { $in: buildingIds } });
      await Building.deleteMany({ organization: id });
    }

    await Organization.findByIdAndDelete(id);

    res.status(200).json({
      message: "Organization and associated resources deleted successfully",
    });
  } catch (error) {
    console.error("Delete organization error:", error.message);
    res.status(500).json({
      message: "Failed to delete organization",
    });
  }
};

module.exports = {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
};
