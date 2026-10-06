const notificationService = require("../services/notificationService");

// @desc    Get user's notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const unreadOnly = req.query.unread === "true";
    const data = await notificationService.getUserNotifications(req.user._id, unreadOnly);
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ message: "Failed to retrieve notifications" });
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const data = await notificationService.getUserNotifications(req.user._id, true);
    return res.status(200).json({ unreadCount: data.unreadCount });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return res.status(500).json({ message: "Failed to fetch unread count" });
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await notificationService.markAsRead(id, req.user._id);
    return res.status(200).json({ message: "Marked as read", notification });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(404).json({ message: error.message || "Notification not found" });
  }
};

// @desc    Mark all user notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await notificationService.markAllAsRead(req.user._id);
    return res.status(200).json({ message: "All notifications marked as read", modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return res.status(500).json({ message: "Failed to mark all as read" });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await notificationService.deleteNotification(id, req.user._id);
    return res.status(200).json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return res.status(500).json({ message: "Failed to delete notification" });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
};
