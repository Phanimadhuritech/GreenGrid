const mongoose = require("mongoose");
const MeterReading = require("../models/MeterReading");
const Meter = require("../models/Meter");
const Unit = require("../models/Unit");
const Building = require("../models/Building");

/**
 * Normalizes a date to UTC Midnight (YYYY-MM-DD 00:00:00.000Z)
 */
const normalizeDate = (inputDate) => {
  const d = new Date(inputDate);
  if (isNaN(d.getTime())) {
    throw new Error("Invalid date provided");
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

/**
 * Validates chronological reading consistency (monotonic progression & duplicate prevention)
 */
const validateReadingProgression = async (
  meterId,
  readingDate,
  readingValue,
  excludeReadingId = null
) => {
  const normalizedDate = normalizeDate(readingDate);

  // 1. Duplicate check for exact same calendar date
  const duplicateQuery = {
    meter: meterId,
    readingDate: normalizedDate,
  };
  if (excludeReadingId) {
    duplicateQuery._id = { $ne: excludeReadingId };
  }

  const existingOnDate = await MeterReading.findOne(duplicateQuery);
  if (existingOnDate) {
    return {
      isValid: false,
      statusCode: 400,
      message: "Reading already exists for this meter and date.",
    };
  }

  // 2. Monotonic progression check against previous reading
  const prevQuery = {
    meter: meterId,
    readingDate: { $lt: normalizedDate },
  };
  if (excludeReadingId) {
    prevQuery._id = { $ne: excludeReadingId };
  }

  const prevReading = await MeterReading.findOne(prevQuery).sort({
    readingDate: -1,
  });

  if (prevReading && Number(readingValue) < Number(prevReading.readingValue)) {
    return {
      isValid: false,
      statusCode: 400,
      message: "Current reading cannot be less than previous reading.",
    };
  }

  // 3. Monotonic progression check against next reading
  const nextQuery = {
    meter: meterId,
    readingDate: { $gt: normalizedDate },
  };
  if (excludeReadingId) {
    nextQuery._id = { $ne: excludeReadingId };
  }

  const nextReading = await MeterReading.findOne(nextQuery).sort({
    readingDate: 1,
  });

  if (nextReading && Number(readingValue) > Number(nextReading.readingValue)) {
    return {
      isValid: false,
      statusCode: 400,
      message: "Current reading cannot be greater than subsequent reading.",
    };
  }

  return {
    isValid: true,
    normalizedDate,
    previousReading: prevReading,
    nextReading,
  };
};

/**
 * Calculates consumption for a sorted list of readings
 */
const calculateConsumptionList = (readings) => {
  if (!readings || readings.length === 0) return [];

  const results = [];
  for (let i = 0; i < readings.length; i++) {
    const current = readings[i];
    const prev = i > 0 ? readings[i - 1] : null;

    const previousReadingVal = prev ? prev.readingValue : null;
    const consumptionVal = prev
      ? Number((current.readingValue - prev.readingValue).toFixed(2))
      : 0;

    results.push({
      _id: current._id,
      readingDate: current.readingDate,
      currentReading: current.readingValue,
      previousReading: previousReadingVal,
      consumption: consumptionVal,
      isBaseline: i === 0,
      source: current.source,
      status: current.status,
      notes: current.notes,
      meter: current.meter,
      recordedBy: current.recordedBy,
      createdAt: current.createdAt,
    });
  }

  return results;
};

/**
 * Calculates consumption for a single meter
 */
const getMeterConsumptionData = async (meterId) => {
  const meter = await Meter.findById(meterId).populate({
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
  });

  if (!meter) {
    return null;
  }

  const readings = await MeterReading.find({ meter: meterId }).sort({
    readingDate: 1,
  });

  const consumptionList = calculateConsumptionList(readings);
  const totalConsumption = consumptionList.reduce(
    (acc, curr) => acc + (curr.consumption || 0),
    0
  );

  return {
    meter,
    totalConsumption: Number(totalConsumption.toFixed(2)),
    consumption: consumptionList,
  };
};

/**
 * Calculates consumption for a unit across its meters
 */
const getUnitConsumptionData = async (unitId) => {
  const unit = await Unit.findById(unitId).populate({
    path: "building",
    select: "name code organization",
    populate: {
      path: "organization",
      select: "name status",
    },
  });

  if (!unit) {
    return null;
  }

  const meters = await Meter.find({ unit: unitId });
  const meterIds = meters.map((m) => m._id);

  const readings = await MeterReading.find({ meter: { $in: meterIds } })
    .populate("meter", "meterNumber meterType status")
    .sort({ readingDate: 1 });

  // Group readings by meter to calculate accurate per-meter consumption
  const readingsByMeter = {};
  meters.forEach((m) => {
    readingsByMeter[m._id.toString()] = [];
  });

  readings.forEach((r) => {
    const mId = r.meter?._id?.toString() || r.meter?.toString();
    if (readingsByMeter[mId]) {
      readingsByMeter[mId].push(r);
    }
  });

  let allConsumptionEntries = [];
  let totalUnitConsumption = 0;

  for (const mId of Object.keys(readingsByMeter)) {
    const list = calculateConsumptionList(readingsByMeter[mId]);
    allConsumptionEntries.push(...list);
  }

  // Sort combined consumption chronologically
  allConsumptionEntries.sort((a, b) => new Date(a.readingDate) - new Date(b.readingDate));

  totalUnitConsumption = allConsumptionEntries.reduce(
    (acc, curr) => acc + (curr.consumption || 0),
    0
  );

  return {
    unit,
    meters,
    totalConsumption: Number(totalUnitConsumption.toFixed(2)),
    consumption: allConsumptionEntries,
  };
};

/**
 * Calculates aggregated consumption for a building
 */
const getBuildingConsumptionData = async (buildingId) => {
  const building = await Building.findById(buildingId).populate(
    "organization",
    "name status"
  );

  if (!building) {
    return null;
  }

  const units = await Unit.find({ building: buildingId });
  const unitIds = units.map((u) => u._id);

  const meters = await Meter.find({ unit: { $in: unitIds } }).populate(
    "unit",
    "unitNumber floor type"
  );
  const meterIds = meters.map((m) => m._id);

  const readings = await MeterReading.find({ meter: { $in: meterIds } })
    .populate({
      path: "meter",
      select: "meterNumber status unit",
      populate: {
        path: "unit",
        select: "unitNumber floor",
      },
    })
    .sort({ readingDate: 1 });

  // Group by meter
  const readingsByMeter = {};
  meters.forEach((m) => {
    readingsByMeter[m._id.toString()] = [];
  });

  readings.forEach((r) => {
    const mId = r.meter?._id?.toString() || r.meter?.toString();
    if (readingsByMeter[mId]) {
      readingsByMeter[mId].push(r);
    }
  });

  let allEntries = [];
  for (const mId of Object.keys(readingsByMeter)) {
    const list = calculateConsumptionList(readingsByMeter[mId]);
    allEntries.push(...list);
  }

  allEntries.sort((a, b) => new Date(a.readingDate) - new Date(b.readingDate));

  const totalBuildingConsumption = allEntries.reduce(
    (acc, curr) => acc + (curr.consumption || 0),
    0
  );

  return {
    building,
    totalUnits: units.length,
    totalMeters: meters.length,
    totalConsumption: Number(totalBuildingConsumption.toFixed(2)),
    consumptionHistory: allEntries,
  };
};

module.exports = {
  normalizeDate,
  validateReadingProgression,
  calculateConsumptionList,
  getMeterConsumptionData,
  getUnitConsumptionData,
  getBuildingConsumptionData,
};
