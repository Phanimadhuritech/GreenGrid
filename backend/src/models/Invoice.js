const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, "Invoice number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: [true, "Unit reference is required"],
    },
    meter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meter",
      required: [true, "Meter reference is required"],
    },
    billingPeriod: {
      type: String,
      required: [true, "Billing period is required (e.g. 2026-09)"],
      trim: true,
    },
    previousReading: {
      type: Number,
      default: 0,
    },
    currentReading: {
      type: Number,
      required: [true, "Current reading value is required"],
    },
    consumption: {
      type: Number,
      required: [true, "Consumption is required"],
      min: [0, "Consumption cannot be negative"],
    },
    energyCharge: {
      type: Number,
      required: [true, "Energy charge is required"],
      min: [0, "Energy charge cannot be negative"],
    },
    fixedCharge: {
      type: Number,
      default: 0,
      min: [0, "Fixed charge cannot be negative"],
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, "Tax cannot be negative"],
    },
    adjustment: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },
    slabBreakdown: [
      {
        slabNumber: { type: Number },
        from: { type: Number },
        to: { type: Number, default: null },
        rangeLabel: { type: String },
        rate: { type: Number },
        units: { type: Number },
        amount: { type: Number },
      },
    ],
    tariff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tariff",
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },
    status: {
      type: String,
      enum: {
        values: ["GENERATED", "PENDING", "PAID", "OVERDUE", "CANCELLED"],
        message: "{VALUE} is not a valid invoice status",
      },
      default: "PENDING",
    },
    paidAt: {
      type: Date,
      default: null,
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

// Compound index to prevent duplicate active invoices for same unit and billing period
invoiceSchema.index(
  { unit: 1, billingPeriod: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $ne: "CANCELLED" } },
  }
);
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ meter: 1 });

module.exports = mongoose.model("Invoice", invoiceSchema);
