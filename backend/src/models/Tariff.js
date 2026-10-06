const mongoose = require("mongoose");

const slabSchema = new mongoose.Schema(
  {
    from: {
      type: Number,
      required: [true, "Slab 'from' value is required"],
      min: [0, "Slab 'from' value cannot be negative"],
    },
    to: {
      type: Number,
      default: null, // null represents unlimited / infinity
    },
    rate: {
      type: Number,
      required: [true, "Slab rate is required"],
      min: [0, "Slab rate cannot be negative"],
    },
  },
  { _id: false }
);

const tariffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tariff name is required"],
      trim: true,
    },
    slabs: {
      type: [slabSchema],
      required: [true, "Tariff slabs are required"],
      validate: {
        validator: function (slabs) {
          return Array.isArray(slabs) && slabs.length > 0;
        },
        message: "At least one slab is required in tariff",
      },
    },
    fixedCharge: {
      type: Number,
      default: 0,
      min: [0, "Fixed charge cannot be negative"],
    },
    taxPercentage: {
      type: Number,
      default: 0,
      min: [0, "Tax percentage cannot be negative"],
      max: [100, "Tax percentage cannot exceed 100%"],
    },
    adjustments: {
      type: Number,
      default: 0,
    },
    effectiveFrom: {
      type: Date,
      required: [true, "Effective from date is required"],
    },
    effectiveTo: {
      type: Date,
      default: null,
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

// Compound index for querying active tariffs by effective date
tariffSchema.index({ status: 1, effectiveFrom: 1, effectiveTo: 1 });

module.exports = mongoose.model("Tariff", tariffSchema);
