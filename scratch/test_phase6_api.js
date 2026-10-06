const path = require("path");
const backendPath = "c:/ATP_MERN_DSA/GreenGrid/backend";
const mongoose = require(path.join(backendPath, "node_modules", "mongoose"));
const dotenv = require(path.join(backendPath, "node_modules", "dotenv"));
const bcrypt = require(path.join(backendPath, "node_modules", "bcryptjs"));
dotenv.config({ path: path.join(backendPath, ".env") });

const User = require(path.join(backendPath, "src/models/User"));
const Organization = require(path.join(backendPath, "src/models/Organization"));
const Building = require(path.join(backendPath, "src/models/Building"));
const Unit = require(path.join(backendPath, "src/models/Unit"));
const Meter = require(path.join(backendPath, "src/models/Meter"));
const MeterReading = require(path.join(backendPath, "src/models/MeterReading"));
const Tariff = require(path.join(backendPath, "src/models/Tariff"));

const BASE_URL = "http://localhost:5000/api";

const results = [];

function recordResult(testNum, testName, passed, details = "") {
  results.push({ testNum, testName, status: passed ? "PASS" : "FAIL", details });
  console.log(`[TEST ${testNum}] ${testName} -> ${passed ? "PASS ✅" : "FAIL ❌"} ${details ? `(${details})` : ""}`);
}

async function loginUser(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const rawCookie = res.headers.get("set-cookie") || "";
  const match = rawCookie.match(/token=([^;]+)/);
  return {
    status: res.status,
    cookie: match ? `token=${match[1]}` : "",
    data: await res.json(),
  };
}

async function runPhase6Tests() {
  console.log("=== STARTING PHASE 6 AUTOMATED TEST SUITE ===\n");

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });

  const defaultPassword = "Phase6Password123!";
  const hashedPw = await bcrypt.hash(defaultPassword, 10);

  // Setup test organizations, buildings, units, meters
  const orgA = await Organization.findOneAndUpdate(
    { name: "P6 Org A" },
    { name: "P6 Org A", address: "Tech Park A", status: "ACTIVE" },
    { upsert: true, new: true }
  );

  const orgB = await Organization.findOneAndUpdate(
    { name: "P6 Org B" },
    { name: "P6 Org B", address: "Tech Park B", status: "ACTIVE" },
    { upsert: true, new: true }
  );

  const bldA = await Building.findOneAndUpdate(
    { code: "P6-BLD-A" },
    { organization: orgA._id, name: "Building Alpha", code: "P6-BLD-A", numberOfFloors: 5, status: "ACTIVE" },
    { upsert: true, new: true }
  );

  const bldB = await Building.findOneAndUpdate(
    { code: "P6-BLD-B" },
    { organization: orgB._id, name: "Building Beta", code: "P6-BLD-B", numberOfFloors: 5, status: "ACTIVE" },
    { upsert: true, new: true }
  );

  const unitA = await Unit.findOneAndUpdate(
    { building: bldA._id, unitNumber: "P6-101" },
    { building: bldA._id, unitNumber: "P6-101", floor: 1, type: "APARTMENT", status: "OCCUPIED" },
    { upsert: true, new: true }
  );

  const unitB = await Unit.findOneAndUpdate(
    { building: bldB._id, unitNumber: "P6-201" },
    { building: bldB._id, unitNumber: "P6-201", floor: 2, type: "APARTMENT", status: "OCCUPIED" },
    { upsert: true, new: true }
  );

  const adminUser = await User.findOneAndUpdate(
    { email: "p6admin@greengrid.test" },
    { name: "P6 Admin", email: "p6admin@greengrid.test", password: hashedPw, role: "PLATFORM_ADMIN" },
    { upsert: true, new: true }
  );

  const managerUserA = await User.findOneAndUpdate(
    { email: "p6managerA@greengrid.test" },
    { name: "P6 Manager A", email: "p6managerA@greengrid.test", password: hashedPw, role: "FACILITY_MANAGER", organization: orgA._id },
    { upsert: true, new: true }
  );

  const residentUser = await User.findOneAndUpdate(
    { email: "p6resident@greengrid.test" },
    { name: "P6 Resident", email: "p6resident@greengrid.test", password: hashedPw, role: "UNIT_USER", unit: unitA._id },
    { upsert: true, new: true }
  );

  const meterA = await Meter.findOneAndUpdate(
    { meterNumber: "P6-MTR-001" },
    { unit: unitA._id, meterNumber: "P6-MTR-001", meterType: "ELECTRICITY", status: "ACTIVE", lastReading: 1450 },
    { upsert: true, new: true }
  );

  // Seed baseline & current reading for meterA: 1200 on Sep 01, 1450 on Sep 15 (Consumption = 250)
  await MeterReading.deleteMany({ meter: meterA._id });
  await MeterReading.create([
    { meter: meterA._id, readingValue: 1200, readingDate: new Date("2026-09-01T00:00:00.000Z"), source: "MANUAL", status: "VERIFIED" },
    { meter: meterA._id, readingValue: 1450, readingDate: new Date("2026-09-15T00:00:00.000Z"), source: "MANUAL", status: "VERIFIED" },
  ]);

  // Authenticate users
  const adminAuth = await loginUser("p6admin@greengrid.test", defaultPassword);
  recordResult(1, "Admin login", adminAuth.status === 200);

  const managerAuth = await loginUser("p6managerA@greengrid.test", defaultPassword);
  recordResult(2, "Manager login", managerAuth.status === 200);

  const residentAuth = await loginUser("p6resident@greengrid.test", defaultPassword);
  recordResult("2b", "Resident login", residentAuth.status === 200);

  const adminCookie = adminAuth.cookie;
  const managerCookie = managerAuth.cookie;
  const residentCookie = residentAuth.cookie;

  // Clean old test tariffs
  await Tariff.deleteMany({ name: /^P6/i });

  // TEST 2: Create Tariff (Standard 2026 Residential Tariff)
  let sampleTariffId = "";
  const tariffPayload = {
    name: "P6 Residential Tariff 2026",
    slabs: [
      { from: 0, to: 100, rate: 3 },
      { from: 101, to: 200, rate: 5 },
      { from: 201, to: null, rate: 7 },
    ],
    fixedCharge: 100,
    taxPercentage: 18,
    adjustments: 0,
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
    status: "ACTIVE",
  };

  const createTariffRes = await fetch(`${BASE_URL}/tariffs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify(tariffPayload),
  });
  const createTariffData = await createTariffRes.json();
  sampleTariffId = createTariffData.tariff?._id;
  recordResult(2, "Create tariff", createTariffRes.status === 201 && !!sampleTariffId, `Status: ${createTariffRes.status}`);

  // TEST 3: Get all tariffs
  const getTariffsRes = await fetch(`${BASE_URL}/tariffs`, {
    headers: { Cookie: adminCookie },
  });
  const getTariffsData = await getTariffsRes.json();
  recordResult(3, "Get tariffs", getTariffsRes.status === 200 && Array.isArray(getTariffsData.tariffs), `Count: ${getTariffsData.tariffs?.length}`);

  // TEST 4: Get tariff by ID
  const getTariffRes = await fetch(`${BASE_URL}/tariffs/${sampleTariffId}`, {
    headers: { Cookie: adminCookie },
  });
  const getTariffData = await getTariffRes.json();
  recordResult(4, "Get tariff by ID", getTariffRes.status === 200 && getTariffData.tariff?._id === sampleTariffId);

  // TEST 5: Update tariff
  const updateTariffRes = await fetch(`${BASE_URL}/tariffs/${sampleTariffId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ name: "P6 Residential Tariff 2026 Updated", fixedCharge: 100 }),
  });
  const updateTariffData = await updateTariffRes.json();
  recordResult(5, "Update tariff", updateTariffRes.status === 200 && updateTariffData.tariff?.name?.includes("Updated"));

  // TEST 7: Invalid tariff (empty name, missing slabs)
  const invRes = await fetch(`${BASE_URL}/tariffs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ name: "  ", slabs: [] }),
  });
  recordResult(7, "Invalid tariff rejected (empty name/slabs)", invRes.status === 400);

  // TEST 8: Overlapping slabs rejected
  const overlapRes = await fetch(`${BASE_URL}/tariffs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      name: "P6 Overlapping Tariff",
      slabs: [
        { from: 0, to: 100, rate: 3 },
        { from: 50, to: 200, rate: 5 },
      ],
      effectiveFrom: "2026-01-01",
    }),
  });
  recordResult(8, "Overlapping slabs rejected (400)", overlapRes.status === 400);

  // TEST 9: Invalid slab rate rejected (negative rate)
  const negRateRes = await fetch(`${BASE_URL}/tariffs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      name: "P6 Negative Rate Tariff",
      slabs: [{ from: 0, to: 100, rate: -5 }],
      effectiveFrom: "2026-01-01",
    }),
  });
  recordResult(9, "Invalid negative rate rejected (400)", negRateRes.status === 400);

  // TEST 10: Invalid fixed charge rejected
  const negFixedRes = await fetch(`${BASE_URL}/tariffs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      name: "P6 Negative Fixed Charge",
      slabs: [{ from: 0, to: 100, rate: 3 }],
      fixedCharge: -100,
      effectiveFrom: "2026-01-01",
    }),
  });
  recordResult(10, "Negative fixed charge rejected (400)", negFixedRes.status === 400);

  // TEST 11: Invalid tax rejected (> 100%)
  const invTaxRes = await fetch(`${BASE_URL}/tariffs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      name: "P6 Invalid Tax",
      slabs: [{ from: 0, to: 100, rate: 3 }],
      taxPercentage: 150,
      effectiveFrom: "2026-01-01",
    }),
  });
  recordResult(11, "Invalid tax percentage rejected (400)", invTaxRes.status === 400);

  // TEST 12: Invalid effective dates rejected (effectiveTo < effectiveFrom)
  const invDatesRes = await fetch(`${BASE_URL}/tariffs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      name: "P6 Invalid Dates",
      slabs: [{ from: 0, to: 100, rate: 3 }],
      effectiveFrom: "2026-12-31",
      effectiveTo: "2026-01-01",
    }),
  });
  recordResult(12, "Invalid effective dates rejected (400)", invDatesRes.status === 400);

  // TEST 13, 14, 15, 16, 17, 18, 30: EXACT BILLING CALCULATION TEST
  // Consumption = 250 units
  // Slabs: 0-100 @ 3 (=300), 101-200 @ 5 (=500), 201+ @ 7 (=350) -> Energy Charge = 1150
  // Fixed Charge = 100 -> Subtotal = 1250
  // Tax (18%) = 225
  // Adjustment = 0
  // Final Total = 1475.00
  const calcRes = await fetch(`${BASE_URL}/billing/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      consumption: 250,
      tariffId: sampleTariffId,
    }),
  });
  const calcData = await calcRes.json();
  recordResult(13, "POST /api/billing/calculate endpoint works", calcRes.status === 200);
  recordResult(14, "Correct slab calculation (100*3 + 100*5 + 50*7 = ₹1,150)", calcData.energyCharge === 1150, `Got: ${calcData.energyCharge}`);
  recordResult(15, "Correct fixed charge (₹100, Subtotal = ₹1,250)", calcData.fixedCharge === 100 && calcData.subtotal === 1250, `Subtotal: ${calcData.subtotal}`);
  recordResult(16, "Correct tax calculation (18% of 1250 = ₹225)", calcData.tax === 225, `Tax: ${calcData.tax}`);
  recordResult(17, "Correct adjustment (₹0)", calcData.adjustment === 0);
  recordResult("18 & 30", "Correct final bill total (₹1,475.00)", calcData.totalAmount === 1475, `Total: ₹${calcData.totalAmount}`);

  // TEST 18b: Meter bill calculation from actual readings
  const meterCalcRes = await fetch(`${BASE_URL}/billing/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      meterId: meterA._id.toString(),
      tariffId: sampleTariffId,
    }),
  });
  const meterCalcData = await meterCalcRes.json();
  recordResult("18b", "Meter calculation derived from stored readings (1450-1200=250 kWh -> ₹1,475)", meterCalcData.consumption === 250 && meterCalcData.totalAmount === 1475);

  // TEST 19: No applicable tariff error handling
  const noTariffRes = await fetch(`${BASE_URL}/billing/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      consumption: 100,
      referenceDate: "2015-01-01",
    }),
  });
  const noTariffData = await noTariffRes.json();
  recordResult(19, "No applicable tariff returns clean error", noTariffRes.status === 400 && noTariffData.message?.includes("tariff"));

  // TEST 20: Unauthorized unauthenticated billing request rejected (401)
  const unauthRes = await fetch(`${BASE_URL}/billing/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ consumption: 100 }),
  });
  recordResult(20, "Unauthenticated billing request rejected (401)", unauthRes.status === 401);

  // TEST 21: Manager cross-organization billing attempt rejected (403)
  const crossOrgRes = await fetch(`${BASE_URL}/billing/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: managerCookie },
    body: JSON.stringify({ unitId: unitB._id.toString() }), // Unit B belongs to Org B, manager is Org A
  });
  recordResult(21, "Manager cross-organization billing attempt rejected (403)", crossOrgRes.status === 403);

  // TEST 22: Resident accessing another unit's billing data rejected (403)
  const resCrossRes = await fetch(`${BASE_URL}/billing/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: residentCookie },
    body: JSON.stringify({ unitId: unitB._id.toString() }), // Resident is assigned to Unit A
  });
  recordResult(22, "Resident unauthorized unit billing rejected (403)", resCrossRes.status === 403);

  // TEST 6: Delete tariff test (temporary tariff)
  const tempTariff = await Tariff.create({
    name: "P6 Temp Tariff To Delete",
    slabs: [{ from: 0, to: 50, rate: 2 }],
    effectiveFrom: new Date("2026-01-01"),
  });
  const delTariffRes = await fetch(`${BASE_URL}/tariffs/${tempTariff._id}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
  recordResult(6, "Delete tariff (200)", delTariffRes.status === 200);

  // TEST 23: Phase 5 consumption APIs regression
  const p5Res = await fetch(`${BASE_URL}/consumption/meter/${meterA._id}`, {
    headers: { Cookie: adminCookie },
  });
  const p5Data = await p5Res.json();
  recordResult(23, "Existing Phase 5 consumption still works", p5Res.status === 200 && p5Data.consumption !== undefined);

  // TEST 24: Phase 4 meter APIs regression
  const p4Res = await fetch(`${BASE_URL}/meters`, {
    headers: { Cookie: adminCookie },
  });
  const p4Data = await p4Res.json();
  recordResult(24, "Existing Phase 4 meter APIs still work", p4Res.status === 200 && Array.isArray(p4Data.meters));

  // TEST 25: Phase 3 hierarchy APIs regression
  const p3Res = await fetch(`${BASE_URL}/organizations`, {
    headers: { Cookie: adminCookie },
  });
  const p3Data = await p3Res.json();
  recordResult(25, "Existing Phase 3 hierarchy APIs still work", p3Res.status === 200 && Array.isArray(p3Data.organizations));

  // TEST 26: Phase 2 authentication regression
  const p2Res = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Cookie: adminCookie },
  });
  const p2Data = await p2Res.json();
  recordResult(26, "Existing Phase 2 authentication still works", p2Res.status === 200 && p2Data.user?.role === "PLATFORM_ADMIN");

  console.log("\n=== SUMMARY ===");
  const passedCount = results.filter((r) => r.status === "PASS").length;
  console.log(`TOTAL TESTS: ${results.length}, PASSED: ${passedCount}, FAILED: ${results.length - passedCount}`);
  if (passedCount === results.length) {
    console.log("ALL PHASE 6 BACKEND TESTS PASSED 100% ✅");
  }

  await mongoose.disconnect();
}

runPhase6Tests();
