const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} = require("../controllers/notificationController");

router.use(protect);

router.get("/unread", getUnreadCount);
router.put("/read-all", markAllNotificationsRead);

router.route("/")
  .get(getNotifications);

router.route("/:id")
  .delete(deleteNotification);

router.put("/:id/read", markNotificationRead);

module.exports = router;
