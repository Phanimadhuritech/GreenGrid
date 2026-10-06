const API_BASE = "http://localhost:5000/api";

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ [PASS] ${message}`);
}

async function runBenchmarkAndStabilityTests() {
  console.log("===================================================================");
  console.log("⚡ GREENGRID BILLING BENCHMARK & AUTH/RBAC STABILITY VERIFICATION");
  console.log("===================================================================");

  try {
    // -------------------------------------------------------------
    // 1. Unauthenticated /api/auth/me Check
    // -------------------------------------------------------------
    console.log("\n[TEST 1]: Clean 401 for Unauthenticated Session");
    const unauthRes = await fetch(`${API_BASE}/auth/me`);
    assert(unauthRes.status === 401, "Unauthenticated GET /api/auth/me returns clean HTTP 401");

    // -------------------------------------------------------------
    // 2. Admin Login & Session Retrieval
    // -------------------------------------------------------------
    console.log("\n[TEST 2]: Authenticated Login & /api/auth/me Session Retrieval");
    const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@greengrid.test",
        password: "AdminPassword123!",
      }),
    });
    const adminData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200, "Admin login succeeds (HTTP 200)");
    
    const adminHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminData.token}`,
      Cookie: adminLoginRes.headers.get("set-cookie") || "",
    };

    const adminMeRes = await fetch(`${API_BASE}/auth/me`, { headers: adminHeaders });
    const adminMeData = await adminMeRes.json();
    assert(adminMeRes.status === 200, "Admin session verified via GET /api/auth/me (HTTP 200)");
    assert(adminMeData.user?.role === "PLATFORM_ADMIN", "Admin role correctly identified as PLATFORM_ADMIN");

    // -------------------------------------------------------------
    // 3. Billing Engine 250 kWh Benchmark Calculation
    // -------------------------------------------------------------
    console.log("\n[TEST 3]: Progressive Slab Billing Engine Benchmark (250 kWh = ₹1,475)");
    
    // Find active tariff
    const tariffsRes = await fetch(`${API_BASE}/tariffs`, { headers: adminHeaders });
    const tariffsData = await tariffsRes.json();
    const activeTariff = tariffsData.tariffs?.find((t) => t.fixedCharge === 100 && t.taxPercentage === 18 && t.status === "ACTIVE") || tariffsData.tariffs?.[0];
    assert(!!activeTariff, "Active progressive tariff located");

    // Test with payload { consumption: 250 }
    const calcRes1 = await fetch(`${API_BASE}/billing/calculate`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        consumption: 250,
        tariffId: activeTariff._id,
      }),
    });
    const calcData1 = await calcRes1.json();
    assert(calcRes1.status === 200, "POST /api/billing/calculate with { consumption: 250 } succeeds (HTTP 200)");
    assert(calcData1.consumptionUnits === 250, "Consumption verified as 250 kWh");
    assert(calcData1.energyCharges === 1150, "Energy charge (0-100 @ ₹3, 101-200 @ ₹5, 201-250 @ ₹7) = ₹1,150");
    assert(calcData1.fixedCharge === 100, "Fixed charge = ₹100");
    assert(calcData1.subtotal === 1250, "Subtotal before tax = ₹1,250");
    assert(calcData1.tax === 225, "Statutory Tax (18% of ₹1,250) = ₹225");
    assert(calcData1.totalAmount === 1475, "TOTAL INVOICED BILL = EXACTLY ₹1,475");

    // Test with payload { consumptionUnits: 250 }
    const calcRes2 = await fetch(`${API_BASE}/billing/calculate`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        consumptionUnits: 250,
        tariffId: activeTariff._id,
      }),
    });
    const calcData2 = await calcRes2.json();
    assert(calcRes2.status === 200 && calcData2.totalAmount === 1475, "POST /api/billing/calculate with { consumptionUnits: 250 } yields exact ₹1,475");

    // -------------------------------------------------------------
    // 4. Resident RBAC & Scoped Access Testing
    // -------------------------------------------------------------
    console.log("\n[TEST 4]: Resident RBAC & Resource Isolation");
    const resLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "resident@greengrid.test",
        password: "ResidentPassword123!",
      }),
    });
    const resData = await resLoginRes.json();
    assert(resLoginRes.status === 200, "Resident login succeeds (HTTP 200)");

    const resHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resData.token}`,
      Cookie: resLoginRes.headers.get("set-cookie") || "",
    };

    // Resident accessing tariffs -> 403
    const resTariffRes = await fetch(`${API_BASE}/tariffs`, { headers: resHeaders });
    assert(resTariffRes.status === 403, "Resident access to /api/tariffs correctly rejected with HTTP 403 Forbidden");

    // Resident accessing meters -> 403
    const resMetersRes = await fetch(`${API_BASE}/meters`, { headers: resHeaders });
    assert(resMetersRes.status === 403, "Resident access to /api/meters correctly rejected with HTTP 403 Forbidden");

    // Resident accessing organizations -> 403 (when creating)
    const resOrgCreateRes = await fetch(`${API_BASE}/organizations`, {
      method: "POST",
      headers: resHeaders,
      body: JSON.stringify({ name: "Unauthorized Org", address: "123 Street" }),
    });
    assert(resOrgCreateRes.status === 403, "Resident creation of organization correctly rejected with HTTP 403 Forbidden");

    // Resident accessing own invoices -> 200
    const resMyInvoices = await fetch(`${API_BASE}/invoices/my`, { headers: resHeaders });
    assert(resMyInvoices.status === 200, "Resident access to /api/invoices/my succeeds with HTTP 200 OK");

    // Resident accessing own maintenance -> 200
    const resMyMaint = await fetch(`${API_BASE}/maintenance/my`, { headers: resHeaders });
    assert(resMyMaint.status === 200, "Resident access to /api/maintenance/my succeeds with HTTP 200 OK");

    console.log("\n===================================================================");
    console.log("🎉 ALL BENCHMARK & STABILITY VERIFICATIONS PASSED WITH 100% SUCCESS!");
    console.log("===================================================================");
  } catch (err) {
    console.error("❌ Test suite aborted with error:", err.message);
    process.exit(1);
  }
}

runBenchmarkAndStabilityTests();
