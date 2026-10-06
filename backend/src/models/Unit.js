const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema(
  {
    building: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Building",
      required: [true, "Building reference is required"],
    },
    unitNumber: {
      type: String,
      required: [true, "Unit number is required"],
      trim: true,
    },
    floor: {
      type: Number,
      required: [true, "Floor number is required"],
      default: 1,
    },
    type: {
      type: String,
      enum: ["APARTMENT", "OFFICE", "SHOP", "RETAIL", "COMMON_AREA", "OTHER"],
      default: "APARTMENT",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["OCCUPIED", "VACANT", "INACTIVE", "MAINTENANCE"],
      default: "VACANT",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate unit numbers within the same building
unitSchema.index({ building: 1, unitNumber: 1 }, { unique: true });

module.exports = mongoose.model("Unit", unitSchema);
