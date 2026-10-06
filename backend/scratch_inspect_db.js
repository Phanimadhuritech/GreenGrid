const mongoose = require("mongoose");
require("dotenv").config();

async function inspectOrgsAndBuildings() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const orgs = await mongoose.connection.collection("organizations").find({}).toArray();
  for (const org of orgs) {
    console.log(`\nOrganization: ${org.name} (ID: ${org._id})`);
    const blds = await mongoose.connection.collection("buildings").find({ organization: org._id }).toArray();
    console.log(`   Buildings (${blds.length}):`);
    for (const b of blds) {
      const units = await mongoose.connection.collection("units").find({ building: b._id }).toArray();
      console.log(`     - ${b.name} (${b.code}) -> Units: ${units.length}`);
    }
    const managers = await mongoose.connection.collection("users").find({ organization: org._id, role: "FACILITY_MANAGER" }).toArray();
    console.log(`   Managers: ${managers.map(m => m.name + " <" + m.email + ">").join(", ") || "(none)"}`);
  }

  const allManagers = await mongoose.connection.collection("users").find({ role: "FACILITY_MANAGER" }).toArray();
  console.log("\nALL FACILITY MANAGERS in DB:");
  for (const m of allManagers) {
    console.log(`- ${m.name} (${m.email}) -> Organization: ${m.organization}`);
  }

  await mongoose.disconnect();
}

inspectOrgsAndBuildings().catch(console.error);
