const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const connectDB = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");
const testRoutes = require("./src/routes/testRoutes");
const organizationRoutes = require("./src/routes/organizationRoutes");
const buildingRoutes = require("./src/routes/buildingRoutes");
const unitRoutes = require("./src/routes/unitRoutes");
const meterRoutes = require("./src/routes/meterRoutes");
const readingRoutes = require("./src/routes/readingRoutes");
const consumptionRoutes = require("./src/routes/consumptionRoutes");
const tariffRoutes = require("./src/routes/tariffRoutes");
const billingRoutes = require("./src/routes/billingRoutes");
const invoiceRoutes = require("./src/routes/invoiceRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");
const maintenanceRoutes = require("./src/routes/maintenanceRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");
const analyticsRoutes = require("./src/routes/analyticsRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const auditRoutes = require("./src/routes/auditRoutes");
const errorHandler = require("./src/middleware/errorHandler");

const app = express();

// Middleware
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Thunder Client)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive for local development while keeping credentials
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "GreenGrid API is running 🚀"
  });
});
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/buildings", buildingRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/meters", meterRoutes);
app.use("/api/readings", readingRoutes);
app.use("/api/consumption", consumptionRoutes);
app.use("/api/tariffs", tariffRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/audit", auditRoutes);

// Centralized error handler
app.use(errorHandler);

// Server startup
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`GreenGrid server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
  }
};
startServer();