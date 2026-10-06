const mongoose = require("mongoose");
require("dotenv").config();

async function assignAarav() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const aarav = await mongoose.connection.collection("users").findOne({ email: "aarav@gmail.com" });
  if (!aarav) {
    throw new Error("User aarav@gmail.com not found!");
  }

  const unit = await mongoose.connection.collection("units").findOne({
    unitNumber: "A-102",
    building: new mongoose.Types.ObjectId("6ab4bd8aaf4426eb0afc6b8f"),
  });
  if (!unit) {
    throw new Error("Unit A-102 in Building C not found!");
  }

  const bld = await mongoose.connection.collection("buildings").findOne({ _id: unit.building });

  await mongoose.connection.collection("units").updateOne(
    { _id: unit._id },
    { $set: { owner: aarav._id } }
  );

  await mongoose.connection.collection("users").updateOne(
    { _id: aarav._id },
    { $set: { unit: unit._id, organization: bld.organization, status: "ACTIVE" } }
  );

  console.log("Successfully assigned Aarav to Unit A-102 in Building C under Cyber City Hub");

  const updatedUser = await mongoose.connection.collection("users").findOne({ email: "aarav@gmail.com" });
  const updatedUnit = await mongoose.connection.collection("units").findOne({ _id: unit._id });
  console.log("Updated Aarav user:", {
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    unit: updatedUser.unit,
    organization: updatedUser.organization,
  });
  console.log("Updated Unit:", {
    _id: updatedUnit._id,
    unitNumber: updatedUnit.unitNumber,
    owner: updatedUnit.owner,
    building: updatedUnit.building,
  });

  await mongoose.disconnect();
}

assignAarav().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
