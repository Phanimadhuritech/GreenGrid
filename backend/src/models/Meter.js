const mongoose = require("mongoose");

const meterSchema = new mongoose.Schema(
  {
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: [true, "Unit reference is required"],
    },
    meterNumber: {
      type: String,
      required: [true, "Meter number is required"],
      trim: true,
      unique: true,
    },
    meterType: {
      type: String,
      required: [true, "Meter type is required"],
      enum: ["ELECTRICITY"],
      default: "ELECTRICITY",
    },
    installationDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
    lastReading: {
      type: Number,
      default: 0,
      min: [0, "Last reading cannot be negative"],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
meterSchema.index({ unit: 1 });

module.exports = mongoose.model("Meter", meterSchema);
