const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const { getAuditLogs } = require("../controllers/auditController");

router.use(protect);
router.use(authorize("PLATFORM_ADMIN"));

router.get("/", getAuditLogs);

module.exports = router;
