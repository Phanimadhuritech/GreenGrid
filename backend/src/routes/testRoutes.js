const express = require("express");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/admin",
  protect,
  authorize("PLATFORM_ADMIN"),
  (req, res) => {
    res.json({
      message: "Welcome Admin! You have access.",
      user: req.user,
    });
  }
);

router.get(
  "/manager",
  protect,
  authorize(
    "PLATFORM_ADMIN",
    "FACILITY_MANAGER"
  ),
  (req, res) => {
    res.json({
      message: "Welcome Manager!",
      user: req.user,
    });
  }
);

router.get(
  "/technician",
  protect,
  authorize("TECHNICIAN"),
  (req, res) => {
    res.json({
      message: "Welcome Technician!",
      user: req.user,
    });
  }
);

module.exports = router;