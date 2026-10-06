const auditService = require("../services/auditService");

// @desc    Get audit logs
// @route   GET /api/audit
// @access  Private (PLATFORM_ADMIN)
const getAuditLogs = async (req, res) => {
  try {
    const { actor, action, entityType, limit, page } = req.query;
    const data = await auditService.getAuditLogs({ actor, action, entityType, limit, page });
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error retrieving audit logs:", error);
    return res.status(500).json({ message: "Failed to fetch audit logs" });
  }
};

module.exports = {
  getAuditLogs,
};
