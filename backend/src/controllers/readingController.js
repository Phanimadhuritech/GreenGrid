const mongoose = require("mongoose");
const MeterReading = require("../models/MeterReading");
const Meter = require("../models/Meter");
const Unit = require("../models/Unit");
const Building = require("../models/Building");
const {
  normalizeDate,
  validateReadingProgression,
  calculateConsumptionList,
} = require("../services/consumptionService");

// Helper to check user authorization for meter's organization
const isUserAuthorizedForMeter = (user, meterDoc) => {
  if (user.role === "PLATFORM_ADMIN") return true;

  const meterOrgId =
    meterDoc.unit?.building?.organization?._id?.toString() ||
    meterDoc.unit?.building?.organization?.toString();

  if (user.role === "FACILITY_MANAGER") {
    if (!user.organization) return true;
    return meterOrgId === user.organization.toString();
  }

  if (user.role === "UNIT_USER") {
    const ownerId = meterDoc.unit?.owner?.toString() || meterDoc.unit?.owner?._id?.toString();
    const tenantId = meterDoc.unit?.tenant?.toString() || meterDoc.unit?.tenant?._id?.toString();
    const userId = user._id.toString();
    return ownerId === userId || tenantId === userId;
  }

  return false;
};

// @desc    Get all meter readings
// @route   GET /api/readings
// @access  Private
const getReadings = async (req, res) => {
  try {
    const { meter, status, startDate, endDate, unit } = req.query;
    let filter = {};

    if (meter) {
      if (!mongoose.Types.ObjectId.isValid(meter)) {
        return res.status(400).json({ message: "Invalid meter ID" });
      }
      filter.meter = meter;
    }

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.readingDate = {};
      if (startDate) filter.readingDate.$gte = normalizeDate(startDate);
      if (endDate) filter.readingDate.$lte = normalizeDate(endDate);
    }

    // Role-based scoping
    if (req.user.role === "FACILITY_MANAGER" && req.user.organization) {
      const buildings = await Building.find({ organization: req.user.organization }).select("_id");
      const units = await Unit.find({ building: { $in: buildings.map((b) => b._id) } }).select("_id");
      const meters = await Meter.find({ unit: { $in: units.map((u) => u._id) } }).select("_id");
      const allowedMeterIds = meters.map((m) => m._id.toString());

      if (filter.meter) {
        if (!allowedMeterIds.includes(filter.meter.toString())) {
          return res.status(200).json({ count: 0, readings: [] });
        }
      } else {
        filter.meter = { $in: meters.map((m) => m._id) };
      }
    } else if (req.user.role === "UNIT_USER") {
      const userUnits = await Unit.find({
        $or: [{ owner: req.user._id }, { tenant: req.user._id }],
      }).select("_id");
      const userMeters = await Meter.find({ unit: { $in: userUnits.map((u) => u._id) } }).select("_id");
      filter.meter = { $in: userMeters.map((m) => m._id) };
    } else if (unit) {
      if (!mongoose.Types.ObjectId.isValid(unit)) {
        return res.status(400).json({ message: "Invalid unit ID" });
      }
      const unitMeters = await Meter.find({ unit }).select("_id");
      filter.meter = { $in: unitMeters.map((m) => m._id) };
    }

    const readings = await MeterReading.find(filter)
      .populate({
        path: "meter",
        select: "meterNumber meterType status unit lastReading",
        populate: {
          path: "unit",
          select: "unitNumber floor type building",
          populate: {
            path: "building",
            select: "name code organization",
            populate: {
              path: "organization",
              select: "name status",
            },
          },
        },
      })
      .populate("recordedBy", "name email")
      .sort({ readingDate: -1 });

    res.status(200).json({
      count: readings.length,
      readings,
    });
  } catch (error) {
    console.error("Get readings error:", error.message);
    res.status(500).json({ message: "Failed to fetch meter readings" });
  }
};

// @desc    Get single reading by ID
// @route   GET /api/readings/:id
// @access  Private
const getReadingById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid reading ID" });
    }

    const reading = await MeterReading.findById(id)
      .populate({
        path: "meter",
        select: "meterNumber meterType status unit",
        populate: {
          path: "unit",
          select: "unitNumber floor type building owner tenant",
          populate: {
            path: "building",
            select: "name code organization",
            populate: {
              path: "organization",
              select: "name status",
            },
          },
        },
      })
      .populate("recordedBy", "name email");

    if (!reading) {
      return res.status(404).json({ message: "Meter reading not found" });
    }

    if (!isUserAuthorizedForMeter(req.user, reading.meter)) {
      return res.status(403).json({
        message: "You are not authorized to view readings for this organization",
      });
    }

    res.status(200).json({ reading });
  } catch (error) {
    console.error("Get reading by ID error:", error.message);
    res.status(500).json({ message: "Failed to fetch meter reading" });
  }
};

// @desc    Get readings for a specific meter
// @route   GET /api/readings/meter/:meterId
// @access  Private
const getReadingsByMeter = async (req, res) => {
  try {
    const { meterId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(meterId)) {
      return res.status(400).json({ message: "Invalid meter ID" });
    }

    const meter = await Meter.findById(meterId).populate({
      path: "unit",
      select: "unitNumber floor type building owner tenant",
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

    if (!isUserAuthorizedForMeter(req.user, meter)) {
      return res.status(403).json({
        message: "You are not authorized to view readings for this organization",
      });
    }

    const readings = await MeterReading.find({ meter: meterId }).sort({
      readingDate: 1,
    });

    const enrichedReadings = calculateConsumptionList(readings);

    res.status(200).json({
      meter,
      count: enrichedReadings.length,
      readings: enrichedReadings.reverse(), // most recent first for list view
    });
  } catch (error) {
    console.error("Get readings by meter error:", error.message);
    res.status(500).json({ message: "Failed to fetch readings for meter" });
  }
};

// @desc    Create new meter reading
// @route   POST /api/readings
// @access  Private (PLATFORM_ADMIN, FACILITY_MANAGER)
const createReading = async (req, res) => {
  try {
    const {
      meter,
      readingValue,
      readingDate,
      source = "MANUAL",
      status = "VERIFIED",
      notes = "",
    } = req.body;

    // 1. Basic field presence & type validations
    if (!meter || !mongoose.Types.ObjectId.isValid(meter)) {
      return res.status(400).json({ message: "Invalid or missing meter ID" });
    }

    if (readingValue === undefined || readingValue === null || Number(readingValue) < 0 || isNaN(Number(readingValue))) {
      return res.status(400).json({ message: "Reading value must be a non-negative number" });
    }

    if (!readingDate) {
      return res.status(400).json({ message: "Reading date is required" });
    }

    let parsedDate;
    try {
      parsedDate = normalizeDate(readingDate);
    } catch (err) {
      return res.status(400).json({ message: "Invalid reading date provided" });
    }

    if (source && source !== "MANUAL") {
      return res.status(400).json({ message: "Invalid source. Only MANUAL is supported." });
    }

    if (status && !["VERIFIED", "PENDING", "ESTIMATED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // 2. Meter existence & hierarchy verification
    const meterDoc = await Meter.findById(meter).populate({
      path: "unit",
      select: "unitNumber floor building",
      populate: {
        path: "building",
        select: "name code organization",
        populate: {
          path: "organization",
          select: "name status",
        },
      },
    });

    if (!meterDoc) {
      return res.status(400).json({ message: "Invalid or missing meter ID" });
    }

    // 3. Resource isolation check for FACILITY_MANAGER
    if (!isUserAuthorizedForMeter(req.user, meterDoc)) {
      return res.status(403).json({
        message: "You are not authorized to manage readings for this organization",
      });
    }

    // 4. Chronological progression & duplicate date validation
    const validationResult = await validateReadingProgression(
      meterDoc._id,
      parsedDate,
      Number(readingValue)
    );

    if (!validationResult.isValid) {
      return res.status(validationResult.statusCode || 400).json({
        message: validationResult.message,
      });
    }

    // 5. Create meter reading record
    const newReading = await MeterReading.create({
      meter: meterDoc._id,
      readingValue: Number(readingValue),
      readingDate: parsedDate,
      recordedBy: req.user._id,
      source: source || "MANUAL",
      status: status || "VERIFIED",
      notes: notes ? notes.trim() : "",
    });

    // 6. Update Meter.lastReading if this is the newest reading
    const latestReading = await MeterReading.findOne({ meter: meterDoc._id }).sort({ readingDate: -1 });
    if (latestReading && latestReading._id.toString() === newReading._id.toString()) {
      meterDoc.lastReading = Number(readingValue);
      await meterDoc.save();
    }

    // 7. Calculate derived consumption for response
    const prev = validationResult.previousReading;
    const calculatedConsumption = prev
      ? Number((Number(readingValue) - Number(prev.readingValue)).toFixed(2))
      : 0;

    const populatedReading = await MeterReading.findById(newReading._id)
      .populate({
        path: "meter",
        select: "meterNumber meterType status unit",
        populate: {
          path: "unit",
          select: "unitNumber floor building",
          populate: {
            path: "building",
            select: "name code organization",
            populate: {
              path: "organization",
              select: "name status",
            },
          },
        },
      })
      .populate("recordedBy", "name email");

    res.status(201).json({
      message: "Meter reading created successfully",
      reading: populatedReading,
      calculatedConsumption,
      isBaseline: !prev,
    });
  } catch (error) {
    console.error("Create reading error:", error.message);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Reading already exists for this meter and date." });
    }
    res.status(500).json({ message: "Failed to create meter reading" });
  }
};

// @desc    Update meter reading
// @route   PUT /api/readings/:id
// @access  Private (PLATFORM_ADMIN, FACILITY_MANAGER)
const updateReading = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid reading ID" });
    }

    const reading = await MeterReading.findById(id).populate({
      path: "meter",
      select: "meterNumber meterType status unit",
      populate: {
        path: "unit",
        select: "unitNumber floor building",
        populate: {
          path: "building",
          select: "name code organization",
          populate: {
            path: "organization",
            select: "name status",
          },
        },
      },
    });

    if (!reading) {
      return res.status(404).json({ message: "Meter reading not found" });
    }

    if (!isUserAuthorizedForMeter(req.user, reading.meter)) {
      return res.status(403).json({
        message: "You are not authorized to update readings for this organization",
      });
    }

    const { readingValue, readingDate, source, status, notes } = req.body;

    const targetVal = readingValue !== undefined ? Number(readingValue) : reading.readingValue;
    if (targetVal < 0 || isNaN(targetVal)) {
      return res.status(400).json({ message: "Reading value must be a non-negative number" });
    }

    let targetDate = reading.readingDate;
    if (readingDate) {
      try {
        targetDate = normalizeDate(readingDate);
      } catch (err) {
        return res.status(400).json({ message: "Invalid reading date provided" });
      }
    }

    // Validate progression
    const validationResult = await validateReadingProgression(
      reading.meter._id,
      targetDate,
      targetVal,
      reading._id
    );

    if (!validationResult.isValid) {
      return res.status(validationResult.statusCode || 400).json({
        message: validationResult.message,
      });
    }

    if (readingValue !== undefined) reading.readingValue = targetVal;
    if (readingDate !== undefined) reading.readingDate = targetDate;
    if (source !== undefined) reading.source = source;
    if (status !== undefined) reading.status = status;
    if (notes !== undefined) reading.notes = notes.trim();

    await reading.save();

    // Update Meter.lastReading if needed
    const latestReading = await MeterReading.findOne({ meter: reading.meter._id }).sort({ readingDate: -1 });
    if (latestReading) {
      await Meter.findByIdAndUpdate(reading.meter._id, { lastReading: latestReading.readingValue });
    }

    const populated = await MeterReading.findById(reading._id)
      .populate({
        path: "meter",
        select: "meterNumber meterType status unit",
        populate: {
          path: "unit",
          select: "unitNumber floor building",
          populate: {
            path: "building",
            select: "name code organization",
            populate: {
              path: "organization",
              select: "name status",
            },
          },
        },
      })
      .populate("recordedBy", "name email");

    res.status(200).json({
      message: "Meter reading updated successfully",
      reading: populated,
    });
  } catch (error) {
    console.error("Update reading error:", error.message);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Reading already exists for this meter and date." });
    }
    res.status(500).json({ message: "Failed to update meter reading" });
  }
};

// @desc    Delete meter reading
// @route   DELETE /api/readings/:id
// @access  Private (PLATFORM_ADMIN, FACILITY_MANAGER)
const deleteReading = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid reading ID" });
    }

    const reading = await MeterReading.findById(id).populate({
      path: "meter",
      select: "meterNumber meterType status unit",
      populate: {
        path: "unit",
        select: "unitNumber floor building",
        populate: {
          path: "building",
          select: "name code organization",
          populate: {
            path: "organization",
            select: "name status",
          },
        },
      },
    });

    if (!reading) {
      return res.status(404).json({ message: "Meter reading not found" });
    }

    if (!isUserAuthorizedForMeter(req.user, reading.meter)) {
      return res.status(403).json({
        message: "You are not authorized to delete readings for this organization",
      });
    }

    const meterId = reading.meter._id;
    await MeterReading.findByIdAndDelete(id);

    // Refresh Meter.lastReading
    const latestRemaining = await MeterReading.findOne({ meter: meterId }).sort({ readingDate: -1 });
    await Meter.findByIdAndUpdate(meterId, {
      lastReading: latestRemaining ? latestRemaining.readingValue : 0,
    });

    res.status(200).json({
      message: "Meter reading deleted successfully",
    });
  } catch (error) {
    console.error("Delete reading error:", error.message);
    res.status(500).json({ message: "Failed to delete meter reading" });
  }
};

module.exports = {
  getReadings,
  getReadingById,
  getReadingsByMeter,
  createReading,
  updateReading,
  deleteReading,
};
