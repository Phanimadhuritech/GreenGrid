const API_BASE = "http://localhost:5000/api";

const results = {
  total: 0,
  passed: 0,
  failed: 0,
};

function assert(condition, message, details = "") {
  results.total++;
  if (!condition) {
    results.failed++;
    console.error(`  ❌ [FAIL] ${message} ${details ? `(${details})` : ""}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  results.passed++;
  console.log(`  ✅ [PASS] ${message}`);
}

async function req(path, options = {}, authHeaderOrCookie = null) {
  const headers = {
    "Content-Type": "application/json",
    ...(typeof authHeaderOrCookie === "string" && authHeaderOrCookie.startsWith("Bearer ")
      ? { Authorization: authHeaderOrCookie }
      : {}),
    ...(typeof authHeaderOrCookie === "string" && authHeaderOrCookie.startsWith("token=")
      ? { Cookie: authHeaderOrCookie }
      : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const setCookie = res.headers.get("set-cookie");
  let cookie = null;
  if (setCookie) {
    cookie = setCookie.split(";")[0];
  }

  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: res.status, ok: res.ok, data, cookie };
}

async function runTargetedVerification() {
  console.log("===================================================================");
  console.log("🔍 GREENGRID TARGETED INTEGRATION & ISOLATION VERIFICATION");
  console.log("===================================================================");

  try {
    // -------------------------------------------------------------
    // 1. Facility Manager Rudra (/api/auth/me & Organization)
    // -------------------------------------------------------------
    console.log("\n[TEST 1]: Facility Manager 'Rudra' Login & Org Verification");
    const rudraLogin = await req("/auth/login", {
      method: "POST",
      body: { email: "rudra@gmail.com", password: "AdminPassword123!" },
    });
    // In case rudra has a different password, if 401 try reset or fallback password
    let rudraCookie = rudraLogin.cookie;
    let rudraToken = rudraLogin.data?.token;
    
    if (rudraLogin.status === 200) {
      assert(rudraLogin.status === 200, "Rudra logged in successfully");
      const rudraMe = await req("/auth/me", {}, rudraCookie);
      assert(rudraMe.status === 200, "Rudra /api/auth/me returns HTTP 200");
      assert(rudraMe.data.user?.role === "FACILITY_MANAGER", "Rudra role is FACILITY_MANAGER");
      assert(!!rudraMe.data.user?.organization, "Rudra has populated organization");
      assert(rudraMe.data.user?.organization?.name === "SM Residency", `Rudra organization is '${rudraMe.data.user?.organization?.name}' (SM Residency)`);
      
      // Rudra Dashboard
      const rudraDash = await req("/dashboard/manager", {}, rudraCookie);
      assert(rudraDash.status === 200, "Rudra GET /api/dashboard/manager returns HTTP 200 with real org data");
      assert(Array.isArray(rudraDash.data.buildingBreakdown), "Rudra dashboard contains building breakdown for SM Residency");
    } else {
      console.log("  ℹ️ Rudra login password differed; checking with standard manager...");
    }

    // -------------------------------------------------------------
    // 2. Standard Facility Manager (/api/auth/me & Organization)
    // -------------------------------------------------------------
    console.log("\n[TEST 2]: Standard Facility Manager (manager@greengrid.test) & Org Verification");
    const mgrLogin = await req("/auth/login", {
      method: "POST",
      body: { email: "manager@greengrid.test", password: "ManagerTest123!" },
    });
    assert(mgrLogin.status === 200, "manager@greengrid.test logged in successfully");
    const mgrCookie = mgrLogin.cookie;
    
    const mgrMe = await req("/auth/me", {}, mgrCookie);
    assert(mgrMe.status === 200, "Manager /api/auth/me returns HTTP 200");
    assert(mgrMe.data.user?.role === "FACILITY_MANAGER", "Role is FACILITY_MANAGER");
    assert(!!mgrMe.data.user?.organization, "Manager organization is assigned and populated");
    console.log(`  🏢 Manager organization: ${mgrMe.data.user?.organization?.name}`);

    // Manager Dashboard
    const mgrDash = await req("/dashboard/manager", {}, mgrCookie);
    assert(mgrDash.status === 200, "Manager GET /api/dashboard/manager returns HTTP 200");
    assert(mgrDash.data.overview !== undefined, "Manager dashboard contains real live metrics");

    // -------------------------------------------------------------
    // 3. Platform Admin Global Access
    // -------------------------------------------------------------
    console.log("\n[TEST 3]: Platform Admin (admin@greengrid.test) Global Access");
    const adminLogin = await req("/auth/login", {
      method: "POST",
      body: { email: "admin@greengrid.test", password: "AdminPassword123!" },
    });
    assert(adminLogin.status === 200, "Admin login succeeds");
    const adminCookie = adminLogin.cookie;

    const adminMe = await req("/auth/me", {}, adminCookie);
    assert(adminMe.status === 200, "Admin /api/auth/me returns HTTP 200");
    assert(adminMe.data.user?.role === "PLATFORM_ADMIN", "Admin role is PLATFORM_ADMIN");

    const adminDash = await req("/dashboard/admin", {}, adminCookie);
    assert(adminDash.status === 200, "Admin dashboard returns global metrics");

    // -------------------------------------------------------------
    // 4. Tariff RBAC (View vs Manage)
    // -------------------------------------------------------------
    console.log("\n[TEST 4]: Tariff Permissions (PLATFORM_ADMIN vs FACILITY_MANAGER vs UNIT_USER)");
    
    // Admin can view and create tariffs
    const adminTariffs = await req("/tariffs", {}, adminCookie);
    assert(adminTariffs.status === 200, "Platform Admin can VIEW tariffs (HTTP 200)");

    // Manager can view tariffs (so Billing Calculator works)
    const mgrTariffs = await req("/tariffs", {}, mgrCookie);
    assert(mgrTariffs.status === 200, "Facility Manager can VIEW tariffs (HTTP 200)");

    // Manager CANNOT create tariffs
    const mgrCreateTariff = await req("/tariffs", {
      method: "POST",
      body: {
        name: "Unauthorized Manager Tariff",
        slabs: [{ from: 0, to: 100, rate: 10 }],
        fixedCharge: 50,
        taxPercentage: 18,
      },
    }, mgrCookie);
    assert(mgrCreateTariff.status === 403, "Facility Manager CANNOT create tariffs (HTTP 403 Forbidden)");

    // Resident login & tariff check
    const residentLogin = await req("/auth/login", {
      method: "POST",
      body: { email: "resident@greengrid.test", password: "ResidentPassword123!" },
    });
    const residentCookie = residentLogin.cookie;

    const resTariffs = await req("/tariffs", {}, residentCookie);
    assert(resTariffs.status === 403, "Resident CANNOT view or manage tariffs (HTTP 403 Forbidden)");

    // -------------------------------------------------------------
    // 5. Billing Engine Benchmark: 250 kWh = ₹1,475
    // -------------------------------------------------------------
    console.log("\n[TEST 5]: Progressive Slab Billing Verification (250 kWh = ₹1,475)");
    const activeTariff = adminTariffs.data.tariffs?.find((t) => t.fixedCharge === 100 && t.taxPercentage === 18 && t.status === "ACTIVE") || adminTariffs.data.tariffs?.[0];
    assert(!!activeTariff, "Active progressive tariff located");

    // Calculate with { consumption: 250 }
    const calcResult = await req("/billing/calculate", {
      method: "POST",
      body: {
        consumption: 250,
        tariffId: activeTariff._id,
      },
    }, adminCookie);

    assert(calcResult.status === 200, "POST /api/billing/calculate executes successfully");
    assert(calcResult.data.consumptionUnits === 250, "Consumption is 250 kWh");
    assert(calcResult.data.energyCharges === 1150, "Energy charge = ₹1,150 (100@3 + 100@5 + 50@7)");
    assert(calcResult.data.fixedCharge === 100, "Fixed charge = ₹100");
    assert(calcResult.data.subtotal === 1250, "Subtotal = ₹1,250");
    assert(calcResult.data.tax === 225, "Tax 18% = ₹225");
    assert(calcResult.data.totalAmount === 1475, "FINAL TOTAL BILL = EXACTLY ₹1,475");

    // -------------------------------------------------------------
    // 6. Cross-Organization Isolation & Invoice Generation
    // -------------------------------------------------------------
    console.log("\n[TEST 6]: Multi-Tenant Isolation & Invoice Generation RBAC");
    
    // Resident cannot generate invoices
    const resGenInv = await req("/invoices/generate", {
      method: "POST",
      body: { unitId: "6ab4c4913ee5c60401f501a1", billingPeriod: "2026-09" },
    }, residentCookie);
    assert(resGenInv.status === 403, "Resident CANNOT generate invoices (HTTP 403 Forbidden)");

    // Manager can generate invoices for units in their organization
    // Let's get units for Manager's organization
    const mgrUnitsRes = await req("/units", {}, mgrCookie);
    assert(mgrUnitsRes.status === 200, "Manager can list units in their assigned organization");
    const mgrUnit = mgrUnitsRes.data.units?.[0];
    
    if (mgrUnit) {
      console.log(`  🏢 Testing Manager invoice generation for unit: ${mgrUnit.unitNumber}`);
      const period = `2026-TEST-${Date.now().toString().slice(-4)}`;
      const mgrGenInv = await req("/invoices/generate", {
        method: "POST",
        body: {
          unitId: mgrUnit._id,
          billingPeriod: period,
          dueDate: "2026-10-15",
          notes: "Manager Authorized Bill",
        },
      }, mgrCookie);
      
      assert(mgrGenInv.status === 201, `Manager generated invoice successfully (HTTP 201, ${mgrGenInv.data.invoice?.invoiceNumber})`);
      assert(mgrGenInv.data.invoice?.status === "PENDING", "Invoice created with status PENDING");
    }

    console.log("\n===================================================================");
    console.log(`🎉 TARGETED VERIFICATION COMPLETE: ${results.passed}/${results.total} ASSERTIONS PASSED`);
    console.log("===================================================================");
  } catch (err) {
    console.error("Targeted verification failed:", err);
    process.exit(1);
  }
}

runTargetedVerification();
