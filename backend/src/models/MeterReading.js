const mongoose = require("mongoose");

const meterReadingSchema = new mongoose.Schema(
  {
    meter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meter",
      required: [true, "Meter reference is required"],
    },
    readingValue: {
      type: Number,
      required: [true, "Reading value is required"],
      min: [0, "Reading value cannot be negative"],
    },
    readingDate: {
      type: Date,
      required: [true, "Reading date is required"],
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    source: {
      type: String,
      enum: ["MANUAL"],
      default: "MANUAL",
    },
    status: {
      type: String,
      enum: ["VERIFIED", "PENDING", "ESTIMATED"],
      default: "VERIFIED",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent multiple readings for the exact same meter and normalized date
meterReadingSchema.index({ meter: 1, readingDate: 1 }, { unique: true });

module.exports = mongoose.model("MeterReading", meterReadingSchema);
