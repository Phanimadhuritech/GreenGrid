const mongoose = require("mongoose");
require("dotenv").config();

async function fixManagerOrg() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const smOrg = await mongoose.connection.collection("organizations").findOne({ name: "SM Residency" });
  if (!smOrg) {
    throw new Error("SM Residency organization not found!");
  }
  console.log(`Found SM Residency organization: ${smOrg._id}`);

  // Update Rudra
  const rudraResult = await mongoose.connection.collection("users").updateOne(
    { email: "rudra@gmail.com" },
    { $set: { organization: smOrg._id, status: "ACTIVE" } }
  );
  console.log(`Updated rudra@gmail.com organization: matched ${rudraResult.matchedCount}, modified ${rudraResult.modifiedCount}`);

  // Verify
  const rudra = await mongoose.connection.collection("users").findOne({ email: "rudra@gmail.com" });
  console.log("Verified Rudra user:", {
    _id: rudra._id,
    name: rudra.name,
    email: rudra.email,
    role: rudra.role,
    organization: rudra.organization,
  });

  await mongoose.disconnect();
}

fixManagerOrg().catch((err) => {
  console.error("Error fixing manager org:", err);
  process.exit(1);
});
