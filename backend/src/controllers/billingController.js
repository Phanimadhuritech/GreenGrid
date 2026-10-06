const Tariff = require("../models/Tariff");
const Meter = require("../models/Meter");
const Unit = require("../models/Unit");
const Building = require("../models/Building");
const {
  roundMoney,
  getApplicableTariff,
  calculateBillForConsumption,
  calculateMeterBill,
} = require("../services/billingService");

/**
 * Checks resource-level access permission for a given unit/meter
 */
const checkResourceAccess = async (user, unitId, meterId = null) => {
  if (user.role === "PLATFORM_ADMIN") {
    return { isAllowed: true };
  }

  let targetUnit = null;

  if (unitId) {
    targetUnit = await Unit.findById(unitId).populate({
      path: "building",
      select: "organization",
    });
  } else if (meterId) {
    const meter = await Meter.findById(meterId).populate({
      path: "unit",
      populate: {
        path: "building",
        select: "organization",
      },
    });
    if (meter && meter.unit) {
      targetUnit = meter.unit;
    }
  }

  if (!targetUnit) {
    return { isAllowed: false, statusCode: 404, message: "Target unit/meter not found." };
  }

  // UNIT_USER: only their own unit
  if (user.role === "UNIT_USER") {
    const userUnitId = user.unit?._id?.toString() || user.unit?.toString();
    const targetUnitId = targetUnit._id.toString();

    if (!userUnitId || userUnitId !== targetUnitId) {
      return {
        isAllowed: false,
        statusCode: 403,
        message: "You are not authorized to access billing calculation for this unit.",
      };
    }
    return { isAllowed: true, unit: targetUnit };
  }

  // FACILITY_MANAGER: only within assigned organization
  if (user.role === "FACILITY_MANAGER") {
    const userOrgId = user.organization?._id?.toString() || user.organization?.toString();
    const unitOrgId =
      targetUnit.building?.organization?._id?.toString() ||
      targetUnit.building?.organization?.toString();

    if (!userOrgId || userOrgId !== unitOrgId) {
      return {
        isAllowed: false,
        statusCode: 403,
        message: "You are not authorized to calculate billing for other organizations.",
      };
    }
    return { isAllowed: true, unit: targetUnit };
  }

  return {
    isAllowed: false,
    statusCode: 403,
    message: "You do not have permission to perform billing calculations.",
  };
};

/**
 * @desc    Calculate electricity bill preview based on consumption or meter
 * @route   POST /api/billing/calculate
 * @access  Private (Authenticated users with resource permission)
 */
const calculateBill = async (req, res) => {
  try {
    const {
      consumption,
      consumptionUnits,
      meterId,
      unitId,
      tariffId,
      startDate,
      endDate,
      referenceDate,
    } = req.body;

    const rawConsumption = (consumption !== undefined && consumption !== null && consumption !== "")
      ? consumption
      : (consumptionUnits !== undefined && consumptionUnits !== null && consumptionUnits !== "" ? consumptionUnits : undefined);

    // Case 1: Direct simulation/calculation with explicit numeric consumption
    if (rawConsumption !== undefined) {
      const numericConsumption = Number(rawConsumption);
      if (isNaN(numericConsumption) || numericConsumption < 0) {
        return res.status(400).json({
          success: false,
          message: "Consumption must be a non-negative number.",
        });
      }

      let tariff = null;
      if (tariffId) {
        if (!tariffId.match(/^[0-9a-fA-F]{24}$/)) {
          return res.status(400).json({
            success: false,
            message: "Invalid tariff ID format.",
          });
        }
        tariff = await Tariff.findById(tariffId);
        if (!tariff) {
          return res.status(404).json({
            success: false,
            message: "Specified tariff not found.",
          });
        }
      } else {
        const queryDate = referenceDate ? new Date(referenceDate) : new Date();
        tariff = await getApplicableTariff(queryDate);
        if (!tariff) {
          return res.status(400).json({
            success: false,
            message: "No applicable active tariff found for the billing period.",
          });
        }
      }

      const calculation = calculateBillForConsumption(numericConsumption, tariff);

      return res.status(200).json({
        success: true,
        message: "Bill calculated successfully",
        ...calculation,
      });
    }

    // Case 2: Calculation for specific Meter
    if (meterId) {
      if (!meterId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: "Invalid meter ID format.",
        });
      }

      const access = await checkResourceAccess(req.user, null, meterId);
      if (!access.isAllowed) {
        return res.status(access.statusCode || 403).json({
          success: false,
          message: access.message,
        });
      }

      const billResult = await calculateMeterBill(meterId, startDate, endDate, tariffId);

      return res.status(200).json({
        success: true,
        message: "Meter bill calculated successfully",
        ...billResult,
      });
    }

    // Case 3: Calculation for specific Unit
    if (unitId) {
      if (!unitId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: "Invalid unit ID format.",
        });
      }

      const access = await checkResourceAccess(req.user, unitId, null);
      if (!access.isAllowed) {
        return res.status(access.statusCode || 403).json({
          success: false,
          message: access.message,
        });
      }

      // Find active meter for this unit
      const meter = await Meter.findOne({ unit: unitId, status: "ACTIVE" });
      if (!meter) {
        return res.status(404).json({
          success: false,
          message: "No active meter found for this unit.",
        });
      }

      const billResult = await calculateMeterBill(meter._id, startDate, endDate, tariffId);

      return res.status(200).json({
        success: true,
        message: "Unit bill calculated successfully",
        unitId,
        ...billResult,
      });
    }

    return res.status(400).json({
      success: false,
      message: "Please provide either consumption, meterId, or unitId to calculate bill.",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to calculate bill",
    });
  }
};

/**
 * @desc    Get bill calculation for a specific meter
 * @route   GET /api/billing/meter/:meterId
 * @access  Private (Authenticated users with resource permission)
 */
const getMeterBill = async (req, res) => {
  try {
    const { meterId } = req.params;
    const { startDate, endDate, tariffId } = req.query;

    if (!meterId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid meter ID format.",
      });
    }

    const access = await checkResourceAccess(req.user, null, meterId);
    if (!access.isAllowed) {
      return res.status(access.statusCode || 403).json({
        success: false,
        message: access.message,
      });
    }

    const billResult = await calculateMeterBill(meterId, startDate, endDate, tariffId);

    return res.status(200).json({
      success: true,
      ...billResult,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to calculate meter bill",
    });
  }
};

/**
 * @desc    Get bill calculation for a specific unit
 * @route   GET /api/billing/unit/:unitId
 * @access  Private (Authenticated users with resource permission)
 */
const getUnitBill = async (req, res) => {
  try {
    const { unitId } = req.params;
    const { startDate, endDate, tariffId } = req.query;

    if (!unitId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid unit ID format.",
      });
    }

    const access = await checkResourceAccess(req.user, unitId, null);
    if (!access.isAllowed) {
      return res.status(access.statusCode || 403).json({
        success: false,
        message: access.message,
      });
    }

    const meter = await Meter.findOne({ unit: unitId, status: "ACTIVE" });
    if (!meter) {
      return res.status(404).json({
        success: false,
        message: "No active meter found for this unit.",
      });
    }

    const billResult = await calculateMeterBill(meter._id, startDate, endDate, tariffId);

    return res.status(200).json({
      success: true,
      unitId,
      ...billResult,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to calculate unit bill",
    });
  }
};

module.exports = {
  calculateBill,
  getMeterBill,
  getUnitBill,
};
