const express = require("express");
const {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} = require("../controllers/organizationController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);

router
  .route("/")
  .get(getOrganizations)
  .post(authorize("PLATFORM_ADMIN"), createOrganization);

router
  .route("/:id")
  .get(getOrganizationById)
  .put(authorize("PLATFORM_ADMIN"), updateOrganization)
  .delete(authorize("PLATFORM_ADMIN"), deleteOrganization);

module.exports = router;
