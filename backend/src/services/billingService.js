const mongoose = require("mongoose");
const Tariff = require("../models/Tariff");
const Meter = require("../models/Meter");
const MeterReading = require("../models/MeterReading");
const Unit = require("../models/Unit");
const Building = require("../models/Building");
const { normalizeDate, calculateConsumptionList } = require("./consumptionService");

/**
 * Standard monetary rounding to 2 decimal places
 */
const roundMoney = (val) => {
  if (val === null || val === undefined || isNaN(val)) return 0;
  return Number((Math.round((Number(val) + Number.EPSILON) * 100) / 100).toFixed(2));
};

/**
 * Validates tariff configuration and slab consistency
 */
const validateTariffData = (data) => {
  const { name, slabs, fixedCharge, taxPercentage, effectiveFrom, effectiveTo } = data;

  if (!name || typeof name !== "string" || !name.trim()) {
    return { isValid: false, message: "Tariff name is required and cannot be empty." };
  }

  if (!Array.isArray(slabs) || slabs.length === 0) {
    return { isValid: false, message: "Tariff must contain at least one slab." };
  }

  // Validate individual slabs and order/continuity
  for (let i = 0; i < slabs.length; i++) {
    const slab = slabs[i];

    if (slab.from === undefined || slab.from === null || isNaN(Number(slab.from)) || Number(slab.from) < 0) {
      return { isValid: false, message: `Slab ${i + 1} 'from' value must be a non-negative number.` };
    }

    if (slab.rate === undefined || slab.rate === null || isNaN(Number(slab.rate)) || Number(slab.rate) < 0) {
      return { isValid: false, message: `Slab ${i + 1} rate cannot be negative.` };
    }

    const hasTo = slab.to !== null && slab.to !== undefined && slab.to !== "";

    if (hasTo) {
      if (isNaN(Number(slab.to)) || Number(slab.to) <= Number(slab.from)) {
        return { isValid: false, message: `Slab ${i + 1} 'to' value must be greater than 'from' value.` };
      }
    } else {
      // Unbounded slab: can only be the last slab
      if (i !== slabs.length - 1) {
        return {
          isValid: false,
          message: `Only the final slab can have an unbounded upper limit (to: null).`,
        };
      }
    }

    // Check overlap with previous slab
    if (i > 0) {
      const prevSlab = slabs[i - 1];
      const prevTo = prevSlab.to !== null && prevSlab.to !== undefined ? Number(prevSlab.to) : Infinity;

      if (Number(slab.from) < prevTo) {
        return {
          isValid: false,
          message: `Tariff slabs must not overlap. Slab ${i + 1} starts at ${slab.from} but previous slab ends at ${prevTo}.`,
        };
      }
    }
  }

  if (fixedCharge !== undefined && fixedCharge !== null) {
    if (isNaN(Number(fixedCharge)) || Number(fixedCharge) < 0) {
      return { isValid: false, message: "Fixed charge cannot be negative." };
    }
  }

  if (taxPercentage !== undefined && taxPercentage !== null) {
    if (isNaN(Number(taxPercentage)) || Number(taxPercentage) < 0 || Number(taxPercentage) > 100) {
      return { isValid: false, message: "Tax percentage must be between 0% and 100%." };
    }
  }

  if (!effectiveFrom) {
    return { isValid: false, message: "Effective from date is required." };
  }

  const dFrom = new Date(effectiveFrom);
  if (isNaN(dFrom.getTime())) {
    return { isValid: false, message: "Invalid effectiveFrom date provided." };
  }

  if (effectiveTo) {
    const dTo = new Date(effectiveTo);
    if (isNaN(dTo.getTime())) {
      return { isValid: false, message: "Invalid effectiveTo date provided." };
    }
    if (dTo < dFrom) {
      return { isValid: false, message: "effectiveTo date cannot be earlier than effectiveFrom date." };
    }
  }

  return { isValid: true };
};

/**
 * Calculates progressive slab charges for given consumption
 */
const calculateSlabCharges = (consumption, slabs) => {
  const units = Math.max(0, Number(consumption) || 0);
  if (!Array.isArray(slabs) || slabs.length === 0) {
    return { energyCharge: 0, breakdown: [] };
  }

  let totalEnergyCharge = 0;
  const breakdown = [];

  for (let i = 0; i < slabs.length; i++) {
    const slab = slabs[i];
    const rate = Number(slab.rate) || 0;

    // Determine lower and upper bounds of this slab
    let slabStart = 0;
    if (i === 0) {
      slabStart = 0;
    } else {
      const prevSlab = slabs[i - 1];
      slabStart = prevSlab.to !== null && prevSlab.to !== undefined ? Number(prevSlab.to) : Number(slab.from);
    }

    const slabEnd = slab.to !== null && slab.to !== undefined && slab.to !== "" ? Number(slab.to) : Infinity;

    // Calculate units falling strictly inside [slabStart, slabEnd]
    let unitsInSlab = 0;
    if (units > slabStart) {
      unitsInSlab = Math.min(units, slabEnd) - slabStart;
    }

    const slabAmount = roundMoney(unitsInSlab * rate);
    totalEnergyCharge += slabAmount;

    breakdown.push({
      slabNumber: i + 1,
      from: Number(slab.from),
      to: slab.to !== null && slab.to !== undefined && slab.to !== "" ? Number(slab.to) : null,
      rangeLabel: slabEnd === Infinity ? `${slab.from}+ units` : `${slab.from}–${slab.to} units`,
      rate,
      units: roundMoney(unitsInSlab),
      amount: slabAmount,
    });
  }

  return {
    energyCharge: roundMoney(totalEnergyCharge),
    breakdown,
  };
};

/**
 * Finds applicable active tariff for a given reference date
 */
const getApplicableTariff = async (referenceDate = new Date()) => {
  const queryDate = normalizeDate(referenceDate);

  const tariff = await Tariff.findOne({
    status: "ACTIVE",
    effectiveFrom: { $lte: queryDate },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: queryDate } }],
  }).sort({ effectiveFrom: -1 });

  return tariff;
};

/**
 * Calculates complete bill given consumption and tariff
 */
const calculateBillForConsumption = (consumption, tariff) => {
  const cons = Math.max(0, roundMoney(consumption));
  const { energyCharge, breakdown } = calculateSlabCharges(cons, tariff.slabs);

  const fixedCharge = roundMoney(tariff.fixedCharge || 0);
  const subtotal = roundMoney(energyCharge + fixedCharge);

  const taxPercentage = Number(tariff.taxPercentage) || 0;
  const tax = roundMoney((subtotal * taxPercentage) / 100);

  const adjustment = roundMoney(tariff.adjustments || 0);
  const totalAmount = roundMoney(subtotal + tax + adjustment);

  return {
    tariff: {
      _id: tariff._id,
      name: tariff.name,
      fixedCharge,
      taxPercentage,
      adjustments: adjustment,
      effectiveFrom: tariff.effectiveFrom,
      effectiveTo: tariff.effectiveTo,
    },
    consumption: cons,
    consumptionUnits: cons,
    energyCharge,
    energyCharges: energyCharge,
    slabBreakdown: breakdown,
    breakdown,
    fixedCharge,
    subtotal,
    taxPercentage,
    tax,
    adjustment,
    totalAmount,
  };
};

/**
 * Calculates bill for a specific meter over a date range or latest readings
 */
const calculateMeterBill = async (meterId, startDate = null, endDate = null, customTariffId = null) => {
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
    throw new Error("Meter not found");
  }

  // Retrieve readings for this meter
  const query = { meter: meterId };
  if (startDate && endDate) {
    query.readingDate = {
      $gte: normalizeDate(startDate),
      $lte: normalizeDate(endDate),
    };
  }

  const readings = await MeterReading.find(query).sort({ readingDate: 1 });

  let consumption = 0;
  let startReading = null;
  let endReading = null;

  if (readings.length >= 2) {
    startReading = readings[0];
    endReading = readings[readings.length - 1];
    consumption = roundMoney(endReading.readingValue - startReading.readingValue);
  } else if (readings.length === 1) {
    // Check if there is an earlier reading
    const earlierReading = await MeterReading.findOne({
      meter: meterId,
      readingDate: { $lt: readings[0].readingDate },
    }).sort({ readingDate: -1 });

    if (earlierReading) {
      startReading = earlierReading;
      endReading = readings[0];
      consumption = roundMoney(endReading.readingValue - earlierReading.readingValue);
    } else {
      startReading = null;
      endReading = readings[0];
      consumption = 0; // Baseline reading
    }
  } else {
    // If no readings in date filter, find the latest 2 readings for the meter
    const latestReadings = await MeterReading.find({ meter: meterId })
      .sort({ readingDate: -1 })
      .limit(2);

    if (latestReadings.length >= 2) {
      endReading = latestReadings[0];
      startReading = latestReadings[1];
      consumption = roundMoney(endReading.readingValue - startReading.readingValue);
    } else if (latestReadings.length === 1) {
      endReading = latestReadings[0];
      consumption = 0;
    }
  }

  // Find tariff
  let tariff = null;
  if (customTariffId) {
    tariff = await Tariff.findById(customTariffId);
    if (!tariff) {
      throw new Error("Specified tariff not found");
    }
  } else {
    const refDate = endReading ? endReading.readingDate : new Date();
    tariff = await getApplicableTariff(refDate);
    if (!tariff) {
      throw new Error("No applicable active tariff found for the billing period.");
    }
  }

  const billCalculation = calculateBillForConsumption(consumption, tariff);

  return {
    meter,
    billingPeriod: {
      startDate: startReading ? startReading.readingDate : null,
      endDate: endReading ? endReading.readingDate : null,
      startReading: startReading ? startReading.readingValue : null,
      endReading: endReading ? endReading.readingValue : null,
    },
    ...billCalculation,
  };
};

module.exports = {
  roundMoney,
  validateTariffData,
  calculateSlabCharges,
  getApplicableTariff,
  calculateBillForConsumption,
  calculateMeterBill,
};
