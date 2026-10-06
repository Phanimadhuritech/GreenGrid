const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const User = require(path.join(__dirname, "src/models/User"));
const Organization = require(path.join(__dirname, "src/models/Organization"));
const Building = require(path.join(__dirname, "src/models/Building"));
const Unit = require(path.join(__dirname, "src/models/Unit"));

async function ensureUsers() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI not found in environment!");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  // Get primary org & unit
  let org = await Organization.findOne();
  if (!org) {
    org = await Organization.create({
      name: "GreenGrid Tech Park",
      code: "GG-TP01",
      status: "ACTIVE",
    });
  }

  let building = await Building.findOne({ organization: org._id });
  if (!building) {
    building = await Building.create({
      name: "Tower A",
      code: "BLD-A",
      organization: org._id,
      numberOfFloors: 5,
    });
  }

  let unit = await Unit.findOne({ building: building._id });
  if (!unit) {
    unit = await Unit.create({
      unitNumber: "A-101",
      floor: 1,
      building: building._id,
      type: "RESIDENTIAL",
    });
  }

  const salt = await bcrypt.genSalt(10);

  const usersToEnsure = [
    {
      name: "Platform Admin",
      email: "admin@greengrid.test",
      password: "AdminPassword123!",
      role: "PLATFORM_ADMIN",
      organization: org._id,
    },
    {
      name: "Facility Manager",
      email: "manager@greengrid.test",
      password: "ManagerTest123!",
      role: "FACILITY_MANAGER",
      organization: org._id,
    },
    {
      name: "Resident User",
      email: "resident@greengrid.test",
      password: "ResidentPassword123!",
      role: "UNIT_USER",
      organization: org._id,
      unit: unit._id,
    },
    {
      name: "Field Technician",
      email: "technician@greengrid.test",
      password: "TechPassword123!",
      role: "TECHNICIAN",
      organization: org._id,
    },
    {
      name: "Finance Officer",
      email: "finance@greengrid.test",
      password: "FinancePassword123!",
      role: "FINANCE_OFFICER",
      organization: org._id,
    },
  ];

  for (const u of usersToEnsure) {
    let existing = await User.findOne({ email: u.email });
    const hashedPassword = await bcrypt.hash(u.password, salt);
    if (!existing) {
      await User.create({
        name: u.name,
        email: u.email,
        password: hashedPassword,
        role: u.role,
        organization: u.organization,
        unit: u.unit,
      });
      console.log(`Created user: ${u.email} (${u.role})`);
    } else {
      existing.password = hashedPassword;
      existing.role = u.role;
      existing.organization = u.organization;
      if (u.unit) existing.unit = u.unit;
      await existing.save();
      console.log(`Updated user: ${u.email} (${u.role})`);
    }
  }

  // Update unit owner
  const resident = await User.findOne({ email: "resident@greengrid.test" });
  if (resident && unit) {
    unit.owner = resident._id;
    await unit.save();
    console.log(`Assigned unit ${unit.unitNumber} owner to resident.`);
  }

  await mongoose.disconnect();
  console.log("Database user setup complete.");
}

ensureUsers().catch((err) => {
  console.error("Error in ensureUsers:", err);
  process.exit(1);
});
