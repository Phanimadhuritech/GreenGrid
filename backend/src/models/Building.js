const mongoose = require("mongoose");

const buildingSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization reference is required"],
    },
    name: {
      type: String,
      required: [true, "Building name is required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Building code is required"],
      trim: true,
      uppercase: true,
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    numberOfFloors: {
      type: Number,
      default: 1,
      min: [1, "Number of floors must be at least 1"],
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate building code within the same organization
buildingSchema.index({ organization: 1, code: 1 }, { unique: true });

module.exports = mongoose.model("Building", buildingSchema);
