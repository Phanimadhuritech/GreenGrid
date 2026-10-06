const Notification = require("../models/Notification");

/**
 * Creates a single notification record
 */
const createNotification = async ({
  recipient,
  type = "SYSTEM",
  title,
  message,
  relatedEntity = null,
  relatedEntityType = "None",
}) => {
  if (!recipient || !title || !message) {
    throw new Error("Recipient, title, and message are required for notification.");
  }

  const notification = await Notification.create({
    recipient,
    type,
    title: title.trim(),
    message: message.trim(),
    relatedEntity,
    relatedEntityType,
    isRead: false,
  });

  return notification;
};

/**
 * Creates bulk notifications for multiple recipients
 */
const createBulkNotifications = async (recipients = [], { type, title, message, relatedEntity, relatedEntityType }) => {
  if (!Array.isArray(recipients) || recipients.length === 0) return [];

  const docs = recipients.map((r) => ({
    recipient: r,
    type,
    title,
    message,
    relatedEntity,
    relatedEntityType,
    isRead: false,
  }));

  return await Notification.insertMany(docs);
};

/**
 * Retrieves notifications for a specific user
 */
const getUserNotifications = async (userId, unreadOnly = false, limit = 50) => {
  const filter = { recipient: userId };
  if (unreadOnly) filter.isRead = false;

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit);

  const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

  return { unreadCount, notifications };
};

/**
 * Marks a single notification as read
 */
const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({ _id: notificationId, recipient: userId });
  if (!notification) {
    throw new Error("Notification not found or access denied.");
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  return notification;
};

/**
 * Marks all notifications as read for a user
 */
const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return { modifiedCount: result.modifiedCount };
};

/**
 * Deletes a notification
 */
const deleteNotification = async (notificationId, userId) => {
  const result = await Notification.findOneAndDelete({ _id: notificationId, recipient: userId });
  return result;
};

module.exports = {
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
