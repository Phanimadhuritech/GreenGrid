const Invoice = require("../models/Invoice");
const Unit = require("../models/Unit");
const Meter = require("../models/Meter");
const billingService = require("../services/billingService");
const notificationService = require("../services/notificationService");

/**
 * Checks for overdue invoices and updates status + notifies resident
 */
const runOverdueInvoiceChecker = async () => {
  const now = new Date();
  const overdueInvoices = await Invoice.find({
    status: "PENDING",
    dueDate: { $lt: now },
  }).populate({
    path: "unit",
    select: "owner tenant unitNumber",
  });

  let updatedCount = 0;

  for (const inv of overdueInvoices) {
    inv.status = "OVERDUE";
    await inv.save();
    updatedCount++;

    const recipient = inv.unit?.owner || inv.unit?.tenant;
    if (recipient) {
      await notificationService.createNotification({
        recipient,
        type: "PAYMENT_OVERDUE",
        title: "Payment Overdue Notice",
        message: `Your electricity bill ${inv.invoiceNumber} for period ${inv.billingPeriod} (₹${inv.totalAmount}) is overdue. Please settle promptly.`,
        relatedEntity: inv._id,
        relatedEntityType: "Invoice",
      }).catch((e) => console.error("Notification error:", e.message));
    }
  }

  return { processed: overdueInvoices.length, updated: updatedCount };
};

/**
 * Checks for invoices due in the next 3 days and sends payment reminders
 */
const runPaymentDueReminders = async () => {
  const now = new Date();
  const threeDaysAhead = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const upcomingInvoices = await Invoice.find({
    status: "PENDING",
    dueDate: { $gte: now, $lte: threeDaysAhead },
  }).populate({
    path: "unit",
    select: "owner tenant unitNumber",
  });

  let notifiedCount = 0;

  for (const inv of upcomingInvoices) {
    const recipient = inv.unit?.owner || inv.unit?.tenant;
    if (recipient) {
      await notificationService.createNotification({
        recipient,
        type: "PAYMENT_DUE",
        title: "Upcoming Bill Due Reminder",
        message: `Your electricity bill ${inv.invoiceNumber} for ₹${inv.totalAmount} is due on ${new Date(inv.dueDate).toLocaleDateString()}.`,
        relatedEntity: inv._id,
        relatedEntityType: "Invoice",
      }).catch((e) => console.error("Notification error:", e.message));
      notifiedCount++;
    }
  }

  return { upcomingCount: upcomingInvoices.length, notifiedCount };
};

/**
 * Idempotent automatic monthly billing run for all units with active meters
 */
const runScheduledBillingCycle = async (customBillingPeriod = null) => {
  const now = new Date();
  const billingPeriod = customBillingPeriod || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const activeMeters = await Meter.find({ status: "ACTIVE" }).populate("unit");
  let generatedCount = 0;
  let skippedCount = 0;

  for (const meter of activeMeters) {
    if (!meter.unit) {
      skippedCount++;
      continue;
    }

    // Check if invoice already exists (Idempotency)
    const existing = await Invoice.findOne({
      unit: meter.unit._id,
      billingPeriod,
      status: { $ne: "CANCELLED" },
    });

    if (existing) {
      skippedCount++;
      continue;
    }

    try {
      const bill = await billingService.calculateMeterBill(meter._id);
      const invoiceNumber = `INV-${billingPeriod.replace(/[^0-9]/g, "")}-${String(await Invoice.countDocuments() + 1).padStart(4, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

      const dueDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

      const invoice = await Invoice.create({
        invoiceNumber,
        unit: meter.unit._id,
        meter: meter._id,
        billingPeriod,
        previousReading: bill.billingPeriod?.startReading ?? 0,
        currentReading: bill.billingPeriod?.endReading ?? 0,
        consumption: bill.consumption,
        energyCharge: bill.energyCharge,
        fixedCharge: bill.fixedCharge,
        tax: bill.tax,
        adjustment: bill.adjustment,
        totalAmount: bill.totalAmount,
        slabBreakdown: bill.slabBreakdown || [],
        tariff: bill.tariff?._id || null,
        issueDate: now,
        dueDate,
        status: "PENDING",
        notes: "Automated monthly billing cycle",
      });

      generatedCount++;

      const recipient = meter.unit.owner || meter.unit.tenant;
      if (recipient) {
        await notificationService.createNotification({
          recipient,
          type: "BILL_GENERATED",
          title: "New Electricity Bill Generated",
          message: `Your electricity bill for period ${billingPeriod} has been generated: ₹${invoice.totalAmount}. Due: ${dueDate.toLocaleDateString()}.`,
          relatedEntity: invoice._id,
          relatedEntityType: "Invoice",
        }).catch((e) => console.error("Notification error:", e.message));
      }
    } catch (err) {
      console.error(`Scheduled billing failed for meter ${meter.meterNumber}:`, err.message);
      skippedCount++;
    }
  }

  return { billingPeriod, generatedCount, skippedCount };
};

module.exports = {
  runOverdueInvoiceChecker,
  runPaymentDueReminders,
  runScheduledBillingCycle,
};
