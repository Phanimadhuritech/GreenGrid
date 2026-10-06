const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient user is required"],
    },
    type: {
      type: String,
      enum: [
        "BILL_GENERATED",
        "PAYMENT_RECEIVED",
        "PAYMENT_DUE",
        "PAYMENT_OVERDUE",
        "MAINTENANCE_ASSIGNED",
        "MAINTENANCE_RESOLVED",
        "SYSTEM",
        "SECURITY",
      ],
      default: "SYSTEM",
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
    },
    relatedEntity: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    relatedEntityType: {
      type: String,
      enum: ["Invoice", "Payment", "MaintenanceRequest", "User", "Meter", "None"],
      default: "None",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
