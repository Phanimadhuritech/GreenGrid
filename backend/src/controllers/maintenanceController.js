const mongoose = require("mongoose");
const MaintenanceRequest = require("../models/MaintenanceRequest");
const Unit = require("../models/Unit");
const Building = require("../models/Building");
const User = require("../models/User");

// @desc    Create a maintenance request
// @route   POST /api/maintenance
// @access  Private (UNIT_USER, FACILITY_MANAGER, PLATFORM_ADMIN)
const createMaintenanceRequest = async (req, res) => {
  try {
    const { unitId, title, description, priority, notes } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "Maintenance title is required" });
    }

    if (!description || typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ message: "Maintenance description is required" });
    }

    let targetUnitId = (unitId && typeof unitId === "object" && unitId._id) ? unitId._id : unitId;

    // If resident did not provide unitId, try using their associated unit
    if (!targetUnitId && req.user.role === "UNIT_USER") {
      if (req.user.unit) {
        targetUnitId = req.user.unit._id || req.user.unit;
      } else {
        const userUnit = await Unit.findOne({
          $or: [{ owner: req.user._id }, { tenant: req.user._id }],
        });
        if (userUnit) targetUnitId = userUnit._id;
      }
    }

    if (!targetUnitId) {
      if (req.user.role === "UNIT_USER") {
        return res.status(400).json({
          message: "You are not currently assigned to any residential unit. Please contact your facility manager to assign a unit to your account before creating maintenance requests.",
        });
      }
      return res.status(400).json({ message: "Please select a target unit for the maintenance request" });
    }

    if (!mongoose.Types.ObjectId.isValid(targetUnitId)) {
      return res.status(400).json({ message: "Invalid unitId format" });
    }

    const unit = await Unit.findById(targetUnitId).populate({
      path: "building",
      select: "name code organization",
    });

    if (!unit) {
      return res.status(404).json({ message: "Target unit not found" });
    }

    // RBAC validation for UNIT_USER: must own, occupy or be assigned to the unit
    if (req.user.role === "UNIT_USER") {
      const isOwner = unit.owner?.toString() === req.user._id.toString();
      const isTenant = unit.tenant?.toString() === req.user._id.toString();
      const userAssignedUnitId = req.user.unit?._id?.toString() || req.user.unit?.toString();
      const isAssigned = userAssignedUnitId && userAssignedUnitId === unit._id.toString();

      if (!isOwner && !isTenant && !isAssigned) {
        return res.status(403).json({
          message: "You are not authorized to create maintenance requests for this unit",
        });
      }
    } else if (req.user.role === "FACILITY_MANAGER" && req.user.organization) {
      const orgId = unit.building?.organization?.toString();
      if (orgId !== req.user.organization.toString()) {
        return res.status(403).json({
          message: "You cannot create maintenance requests outside your organization",
        });
      }
    }

    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    const normalizedPriority = priority ? priority.toUpperCase() : "MEDIUM";
    if (!validPriorities.includes(normalizedPriority)) {
      return res.status(400).json({
        message: `Invalid priority. Allowed values: ${validPriorities.join(", ")}`,
      });
    }

    const maintenance = await MaintenanceRequest.create({
      unit: unit._id,
      building: unit.building._id,
      createdBy: req.user._id,
      title: title.trim(),
      description: description.trim(),
      priority: normalizedPriority,
      status: "OPEN",
      notes: notes ? notes.trim() : "",
    });

    const populated = await MaintenanceRequest.findById(maintenance._id)
      .populate({
        path: "unit",
        select: "unitNumber floor type building",
        populate: { path: "building", select: "name code" },
      })
      .populate("building", "name code")
      .populate("createdBy", "name email role");

    return res.status(201).json({
      message: "Maintenance request created successfully",
      request: populated,
    });
  } catch (error) {
    console.error("Error creating maintenance request:", error);
    return res.status(500).json({ message: "Failed to create maintenance request" });
  }
};

// @desc    Get all maintenance requests with role-based scoping
// @route   GET /api/maintenance
// @access  Private
const getMaintenanceRequests = async (req, res) => {
  try {
    const { status, priority, building, unit, technician, search, page = 1, limit = 50 } = req.query;
    let filter = {};

    // 1. Role-based scoping
    if (req.user.role === "UNIT_USER") {
      const userUnits = await Unit.find({
        $or: [{ owner: req.user._id }, { tenant: req.user._id }, { _id: req.user.unit }],
      }).select("_id");
      filter.$or = [
        { createdBy: req.user._id },
        { unit: { $in: userUnits.map((u) => u._id) } },
      ];
    } else if (req.user.role === "FACILITY_MANAGER" && req.user.organization) {
      const orgBuildings = await Building.find({ organization: req.user.organization }).select("_id");
      filter.building = { $in: orgBuildings.map((b) => b._id) };
    } else if (req.user.role === "TECHNICIAN") {
      filter.assignedTechnician = req.user._id;
    } else if (req.user.role === "FINANCE_OFFICER") {
      return res.status(403).json({
        message: "Finance officers do not have access to maintenance records",
      });
    }

    // 2. Query filters
    if (status) filter.status = status.toUpperCase();
    if (priority) filter.priority = priority.toUpperCase();
    if (building && mongoose.Types.ObjectId.isValid(building)) filter.building = building;
    if (unit && mongoose.Types.ObjectId.isValid(unit)) filter.unit = unit;
    if (technician && mongoose.Types.ObjectId.isValid(technician)) filter.assignedTechnician = technician;

    if (search) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await MaintenanceRequest.countDocuments(filter);
    const requests = await MaintenanceRequest.find(filter)
      .populate({
        path: "unit",
        select: "unitNumber floor type building",
        populate: { path: "building", select: "name code organization" },
      })
      .populate("building", "name code")
      .populate("createdBy", "name email role")
      .populate("assignedTechnician", "name email role phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      count: totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      currentPage: pageNum,
      requests,
    });
  } catch (error) {
    console.error("Error fetching maintenance requests:", error);
    return res.status(500).json({ message: "Failed to retrieve maintenance requests" });
  }
};

// @desc    Get resident's own maintenance requests
// @route   GET /api/maintenance/my
// @access  Private (UNIT_USER)
const getMyMaintenanceRequests = async (req, res) => {
  try {
    const userUnits = await Unit.find({
      $or: [{ owner: req.user._id }, { tenant: req.user._id }, { _id: req.user.unit }],
    }).select("_id");

    const requests = await MaintenanceRequest.find({
      $or: [
        { createdBy: req.user._id },
        { unit: { $in: userUnits.map((u) => u._id) } },
      ],
    })
      .populate({
        path: "unit",
        select: "unitNumber floor type building",
        populate: { path: "building", select: "name code" },
      })
      .populate("building", "name code")
      .populate("assignedTechnician", "name email phone")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Error fetching my maintenance requests:", error);
    return res.status(500).json({ message: "Failed to retrieve requests" });
  }
};

// @desc    Get technician's assigned requests
// @route   GET /api/maintenance/assigned
// @access  Private (TECHNICIAN, PLATFORM_ADMIN, FACILITY_MANAGER)
const getAssignedMaintenanceRequests = async (req, res) => {
  try {
    const technicianId = req.user.role === "TECHNICIAN" ? req.user._id : req.query.technicianId || req.user._id;

    const requests = await MaintenanceRequest.find({ assignedTechnician: technicianId })
      .populate({
        path: "unit",
        select: "unitNumber floor type building owner tenant",
        populate: [
          { path: "building", select: "name code organization" },
          { path: "owner", select: "name email phone" },
          { path: "tenant", select: "name email phone" },
        ],
      })
      .populate("building", "name code")
      .populate("createdBy", "name email role phone")
      .populate("assignedTechnician", "name email phone")
      .sort({ priority: 1, createdAt: -1 });

    return res.status(200).json({
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Error fetching assigned requests:", error);
    return res.status(500).json({ message: "Failed to retrieve assigned requests" });
  }
};

// @desc    Get single maintenance request by ID
// @route   GET /api/maintenance/:id
// @access  Private
const getMaintenanceRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid maintenance request ID format" });
    }

    const request = await MaintenanceRequest.findById(id)
      .populate({
        path: "unit",
        select: "unitNumber floor type building owner tenant",
        populate: [
          {
            path: "building",
            select: "name code organization",
            populate: { path: "organization", select: "name status" },
          },
          { path: "owner", select: "name email phone" },
          { path: "tenant", select: "name email phone" },
        ],
      })
      .populate("building", "name code organization")
      .populate("createdBy", "name email role")
      .populate("assignedTechnician", "name email role phone");

    if (!request) {
      return res.status(404).json({ message: "Maintenance request not found" });
    }

    // RBAC validation
    if (req.user.role === "UNIT_USER") {
      const isCreator = request.createdBy?._id?.toString() === req.user._id.toString();
      const isOwner = request.unit?.owner?._id?.toString() === req.user._id.toString();
      const isTenant = request.unit?.tenant?._id?.toString() === req.user._id.toString();
      const isAssignedUnit = req.user.unit && req.user.unit.toString() === request.unit?._id?.toString();

      if (!isCreator && !isOwner && !isTenant && !isAssignedUnit) {
        return res.status(403).json({
          message: "You are not authorized to view this maintenance request",
        });
      }
    } else if (req.user.role === "TECHNICIAN") {
      if (request.assignedTechnician?._id?.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message: "You are not authorized to view maintenance requests not assigned to you",
        });
      }
    } else if (req.user.role === "FACILITY_MANAGER" && req.user.organization) {
      const orgId = request.building?.organization?._id?.toString() || request.building?.organization?.toString();
      if (orgId !== req.user.organization.toString()) {
        return res.status(403).json({
          message: "You cannot access maintenance requests outside your organization",
        });
      }
    } else if (req.user.role === "FINANCE_OFFICER") {
      return res.status(403).json({
        message: "Finance officers do not have access to maintenance records",
      });
    }

    return res.status(200).json({ request });
  } catch (error) {
    console.error("Error fetching request details:", error);
    return res.status(500).json({ message: "Failed to fetch maintenance request details" });
  }
};

// @desc    Assign a technician to a maintenance request
// @route   PUT /api/maintenance/:id/assign
// @access  Private (PLATFORM_ADMIN, FACILITY_MANAGER)
const assignTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    const { technicianId, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid maintenance request ID format" });
    }

    if (!technicianId || !mongoose.Types.ObjectId.isValid(technicianId)) {
      return res.status(400).json({ message: "Valid technicianId is required" });
    }

    // 1. Verify technician exists and has role TECHNICIAN
    const techUser = await User.findById(technicianId);
    if (!techUser) {
      return res.status(404).json({ message: "Technician user not found" });
    }

    if (techUser.role !== "TECHNICIAN") {
      return res.status(400).json({
        message: `User is not a TECHNICIAN (role: ${techUser.role}). Only users with TECHNICIAN role can be assigned.`,
      });
    }

    // 2. Verify maintenance request
    const request = await MaintenanceRequest.findById(id).populate({
      path: "building",
      select: "organization",
    });

    if (!request) {
      return res.status(404).json({ message: "Maintenance request not found" });
    }

    // Facility Manager org check
    if (req.user.role === "FACILITY_MANAGER" && req.user.organization) {
      const orgId = request.building?.organization?.toString();
      if (orgId !== req.user.organization.toString()) {
        return res.status(403).json({
          message: "You cannot assign technicians to requests outside your organization",
        });
      }
      // If technician has an organization assigned, check compatibility
      if (techUser.organization && techUser.organization.toString() !== req.user.organization.toString()) {
        return res.status(400).json({
          message: "Technician is assigned to a different organization",
        });
      }
    }

    // Update assignment and status
    request.assignedTechnician = technicianId;
    request.assignedAt = new Date();
    request.status = "ASSIGNED";
    if (notes) request.notes = notes.trim();

    await request.save();

    const populated = await MaintenanceRequest.findById(request._id)
      .populate("unit", "unitNumber floor")
      .populate("building", "name code")
      .populate("assignedTechnician", "name email phone");

    return res.status(200).json({
      message: "Technician assigned successfully",
      request: populated,
    });
  } catch (error) {
    console.error("Error assigning technician:", error);
    return res.status(500).json({ message: "Failed to assign technician" });
  }
};

// @desc    Update maintenance request status and resolution notes
// @route   PUT /api/maintenance/:id
// @access  Private (UNIT_USER, TECHNICIAN, FACILITY_MANAGER, PLATFORM_ADMIN)
const updateMaintenanceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, resolutionNotes, notes, technicianId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid maintenance request ID format" });
    }

    const request = await MaintenanceRequest.findById(id).populate({
      path: "building",
      select: "organization",
    });

    if (!request) {
      return res.status(404).json({ message: "Maintenance request not found" });
    }

    // Role-specific validation & state machine
    if (req.user.role === "TECHNICIAN") {
      // Must be assigned to this technician
      if (request.assignedTechnician?.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message: "You can only update maintenance requests assigned to you",
        });
      }

      if (status) {
        const upperStatus = status.toUpperCase();
        if (!["IN_PROGRESS", "RESOLVED"].includes(upperStatus)) {
          return res.status(400).json({
            message: "Technicians can only update status to IN_PROGRESS or RESOLVED",
          });
        }
        request.status = upperStatus;
        if (upperStatus === "RESOLVED") {
          request.resolvedAt = new Date();
        }
      }

      if (resolutionNotes !== undefined) {
        request.resolutionNotes = resolutionNotes.trim();
      }
    } else if (req.user.role === "UNIT_USER") {
      // Resident can only close their own resolved request or add notes
      const isCreator = request.createdBy?.toString() === req.user._id.toString();
      if (!isCreator) {
        return res.status(403).json({
          message: "You can only update your own maintenance requests",
        });
      }

      if (status) {
        const upperStatus = status.toUpperCase();
        if (upperStatus === "CLOSED") {
          request.status = "CLOSED";
        } else {
          return res.status(400).json({
            message: "Residents can only close their resolved maintenance requests",
          });
        }
      }
    } else if (req.user.role === "FACILITY_MANAGER" || req.user.role === "PLATFORM_ADMIN") {
      if (req.user.role === "FACILITY_MANAGER" && req.user.organization) {
        const orgId = request.building?.organization?.toString();
        if (orgId !== req.user.organization.toString()) {
          return res.status(403).json({
            message: "You cannot manage maintenance requests outside your organization",
          });
        }
      }

      if (status) {
        const validStatuses = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];
        const upperStatus = status.toUpperCase();
        if (!validStatuses.includes(upperStatus)) {
          return res.status(400).json({ message: `Invalid maintenance status: ${status}` });
        }
        request.status = upperStatus;
        if (upperStatus === "RESOLVED" && !request.resolvedAt) {
          request.resolvedAt = new Date();
        }
      }

      if (priority) {
        const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
        const upperPriority = priority.toUpperCase();
        if (validPriorities.includes(upperPriority)) {
          request.priority = upperPriority;
        }
      }

      if (technicianId) {
        if (!mongoose.Types.ObjectId.isValid(technicianId)) {
          return res.status(400).json({ message: "Invalid technician ID" });
        }
        const techUser = await User.findById(technicianId);
        if (!techUser || techUser.role !== "TECHNICIAN") {
          return res.status(400).json({ message: "User is not a valid TECHNICIAN" });
        }
        request.assignedTechnician = technicianId;
        request.assignedAt = new Date();
        if (request.status === "OPEN") {
          request.status = "ASSIGNED";
        }
      }

      if (resolutionNotes !== undefined) {
        request.resolutionNotes = resolutionNotes.trim();
      }
    }

    if (notes !== undefined) {
      request.notes = notes.trim();
    }

    await request.save();

    const populated = await MaintenanceRequest.findById(request._id)
      .populate("unit", "unitNumber floor")
      .populate("building", "name code")
      .populate("assignedTechnician", "name email phone")
      .populate("createdBy", "name email role");

    return res.status(200).json({
      message: "Maintenance request updated successfully",
      request: populated,
    });
  } catch (error) {
    console.error("Error updating maintenance request:", error);
    return res.status(500).json({ message: "Failed to update maintenance request" });
  }
};

// @desc    Delete a maintenance request
// @route   DELETE /api/maintenance/:id
// @access  Private (PLATFORM_ADMIN, FACILITY_MANAGER, UNIT_USER)
const deleteMaintenanceRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid maintenance request ID format" });
    }

    const request = await MaintenanceRequest.findById(id).populate({
      path: "building",
      select: "organization",
    });

    if (!request) {
      return res.status(404).json({ message: "Maintenance request not found" });
    }

    if (req.user.role === "UNIT_USER") {
      const isCreator = request.createdBy?.toString() === req.user._id.toString();
      if (!isCreator || request.status !== "OPEN") {
        return res.status(403).json({
          message: "Residents can only delete their own OPEN maintenance requests",
        });
      }
    } else if (req.user.role === "FACILITY_MANAGER" && req.user.organization) {
      const orgId = request.building?.organization?.toString();
      if (orgId !== req.user.organization.toString()) {
        return res.status(403).json({
          message: "You cannot delete maintenance requests outside your organization",
        });
      }
    } else if (req.user.role !== "PLATFORM_ADMIN") {
      return res.status(403).json({
        message: "You are not authorized to delete maintenance requests",
      });
    }

    await MaintenanceRequest.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Maintenance request deleted successfully",
      id,
    });
  } catch (error) {
    console.error("Error deleting maintenance request:", error);
    return res.status(500).json({ message: "Failed to delete maintenance request" });
  }
};

// @desc    Get active technicians available for assignment
// @route   GET /api/maintenance/technicians
// @access  Private (PLATFORM_ADMIN, FACILITY_MANAGER)
const getTechnicians = async (req, res) => {
  try {
    let query = { role: "TECHNICIAN", status: "ACTIVE" };
    if (req.user.role === "FACILITY_MANAGER" && req.user.organization) {
      const orgId = req.user.organization?._id || req.user.organization;
      query.$or = [{ organization: orgId }, { organization: null }];
    }
    const technicians = await User.find(query).select("_id name email phone role organization");
    return res.status(200).json({ success: true, technicians });
  } catch (error) {
    console.error("Error fetching technicians:", error);
    return res.status(500).json({ message: "Failed to fetch technicians" });
  }
};

module.exports = {
  createMaintenanceRequest,
  getMaintenanceRequests,
  getMyMaintenanceRequests,
  getAssignedMaintenanceRequests,
  getMaintenanceRequestById,
  assignTechnician,
  updateMaintenanceRequest,
  deleteMaintenanceRequest,
  getTechnicians,
};
