const AuditLog = require("../models/AuditLog");

/**
 * Logs a secure audit event without leaking passwords or secrets
 */
const logAuditEvent = async ({
  actor = null,
  action,
  entityType = "SYSTEM",
  entityId = null,
  metadata = {},
  req = null,
}) => {
  try {
    const ipAddress = req?.headers?.["x-forwarded-for"] || req?.socket?.remoteAddress || "";
    const userAgent = req?.headers?.["user-agent"] || "";

    // Sanitize metadata to never store passwords or tokens
    const sanitized = { ...metadata };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.JWT_SECRET;

    const log = await AuditLog.create({
      actor: actor || req?.user?._id || null,
      action: action.toUpperCase(),
      entityType,
      entityId,
      metadata: sanitized,
      ipAddress: String(ipAddress),
      userAgent: String(userAgent),
      timestamp: new Date(),
    });

    return log;
  } catch (err) {
    console.error("Audit log creation error:", err.message);
    return null;
  }
};

/**
 * Query audit logs with pagination and filters
 */
const getAuditLogs = async ({ actor, action, entityType, limit = 50, page = 1 }) => {
  const filter = {};
  if (actor) filter.actor = actor;
  if (action) filter.action = action.toUpperCase();
  if (entityType) filter.entityType = entityType;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const total = await AuditLog.countDocuments(filter);
  const logs = await AuditLog.find(filter)
    .populate("actor", "name email role")
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limitNum);

  return { total, totalPages: Math.ceil(total / limitNum), currentPage: pageNum, logs };
};

module.exports = {
  logAuditEvent,
  getAuditLogs,
};
