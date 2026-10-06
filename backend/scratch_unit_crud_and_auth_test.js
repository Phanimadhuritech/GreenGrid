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
    console.error(`  ❌ [FAIL] ${message} ${details ? `— ${details}` : ""}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  results.passed++;
  console.log(`  ✅ [PASS] ${message}`);
}

async function req(path, options = {}, cookieOrToken = null) {
  const headers = {
    "Content-Type": "application/json",
    ...(typeof cookieOrToken === "string" && cookieOrToken.startsWith("Bearer ")
      ? { Authorization: cookieOrToken }
      : {}),
    ...(typeof cookieOrToken === "string" && cookieOrToken.startsWith("token=")
      ? { Cookie: cookieOrToken }
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

async function runUnitCrudAndAuthTest() {
  console.log("===================================================================");
  console.log("🏢 GREENGRID UNIT CREATION, AUTHENTICATION & API VERIFICATION");
  console.log("===================================================================");

  try {
    // -------------------------------------------------------------
    // 1. Authentication Verification (Admin & Manager)
    // -------------------------------------------------------------
    console.log("\n[TEST 1]: Authentication & Session Integrity");

    // Admin Login
    const adminLogin = await req("/auth/login", {
      method: "POST",
      body: { email: "admin@greengrid.test", password: "AdminPassword123!" },
    });
    assert(adminLogin.status === 200, "Admin login succeeds (HTTP 200)");
    assert(!!adminLogin.data?.token, "Admin login response contains token");
    const adminCookie = adminLogin.cookie;

    // Admin /api/auth/me
    const adminMe = await req("/auth/me", {}, adminCookie);
    assert(adminMe.status === 200, "Admin GET /api/auth/me returns HTTP 200");
    assert(adminMe.data.user?.role === "PLATFORM_ADMIN", "Admin role is PLATFORM_ADMIN");

    // Facility Manager Login
    const mgrLogin = await req("/auth/login", {
      method: "POST",
      body: { email: "manager@greengrid.test", password: "ManagerTest123!" },
    });
    assert(mgrLogin.status === 200, "Facility Manager login succeeds (HTTP 200)");
    const mgrCookie = mgrLogin.cookie;

    const mgrMe = await req("/auth/me", {}, mgrCookie);
    assert(mgrMe.status === 200, "Manager GET /api/auth/me returns HTTP 200");
    assert(mgrMe.data.user?.role === "FACILITY_MANAGER", "Manager role is FACILITY_MANAGER");
    assert(!!mgrMe.data.user?.organization, "Manager has assigned organization");
    console.log(`  🏢 Manager organization: ${mgrMe.data.user?.organization?.name}`);

    // -------------------------------------------------------------
    // 2. Technicians Endpoint Verification
    // -------------------------------------------------------------
    console.log("\n[TEST 2]: Authenticated /api/maintenance/technicians Endpoint");
    const techRes = await req("/maintenance/technicians", {}, mgrCookie);
    assert(techRes.status === 200, "GET /api/maintenance/technicians returns HTTP 200");
    assert(Array.isArray(techRes.data.technicians), "Technicians returned as array");
    assert(techRes.data.technicians.length > 0, `Found ${techRes.data.technicians.length} active technicians`);

    // -------------------------------------------------------------
    // 3. Admin Unit Creation (POST /api/units)
    // -------------------------------------------------------------
    console.log("\n[TEST 3]: Platform Admin Unit Creation");

    // Fetch buildings
    const bldRes = await req("/buildings", {}, adminCookie);
    assert(bldRes.status === 200 && bldRes.data.buildings?.length > 0, "Admin fetches buildings");
    const adminBuilding = bldRes.data.buildings[0];

    const uniqueUnitNum1 = `U-ADM-${Date.now().toString().slice(-4)}`;
    const createAdminUnit = await req("/units", {
      method: "POST",
      body: {
        building: adminBuilding._id,
        unitNumber: uniqueUnitNum1,
        floor: 3,
        type: "APARTMENT",
        status: "VACANT",
      },
    }, adminCookie);

    assert(createAdminUnit.status === 201, `Admin POST /api/units succeeds (HTTP 201, Unit: ${uniqueUnitNum1})`);
    const createdUnit1 = createAdminUnit.data.unit;
    assert(createdUnit1?.unitNumber === uniqueUnitNum1, "Created unit number matches payload");
    assert(createdUnit1?.building?.name !== undefined, "Created unit contains populated building");

    // -------------------------------------------------------------
    // 4. Facility Manager Unit Creation (Same Org)
    // -------------------------------------------------------------
    console.log("\n[TEST 4]: Facility Manager Unit Creation within Assigned Org");

    const mgrBldRes = await req("/buildings", {}, mgrCookie);
    assert(mgrBldRes.status === 200 && mgrBldRes.data.buildings?.length > 0, "Manager fetches org buildings");
    const mgrBuilding = mgrBldRes.data.buildings[0];

    const uniqueUnitNum2 = `U-MGR-${Date.now().toString().slice(-4)}`;
    const createMgrUnit = await req("/units", {
      method: "POST",
      body: {
        building: mgrBuilding._id,
        unitNumber: uniqueUnitNum2,
        floor: 2,
        type: "OFFICE",
        status: "VACANT",
      },
    }, mgrCookie);

    assert(createMgrUnit.status === 201, `Manager POST /api/units succeeds (HTTP 201, Unit: ${uniqueUnitNum2})`);
    const createdUnit2 = createMgrUnit.data.unit;
    assert(createdUnit2?.unitNumber === uniqueUnitNum2, "Manager created unit matches payload");

    // -------------------------------------------------------------
    // 5. Cross-Organization Unit Creation Rejection
    // -------------------------------------------------------------
    console.log("\n[TEST 5]: Cross-Organization Isolation Enforcement");

    // Find building in another organization
    const allBldRes = await req("/buildings", {}, adminCookie);
    const mgrOrgId = mgrMe.data.user?.organization?._id || mgrMe.data.user?.organization;
    const otherOrgBuilding = allBldRes.data.buildings.find(
      (b) => b.organization?._id?.toString() !== mgrOrgId.toString() && b.organization?.toString() !== mgrOrgId.toString()
    );

    if (otherOrgBuilding) {
      console.log(`  🏢 Testing cross-org creation on building: ${otherOrgBuilding.name} (Org: ${otherOrgBuilding.organization?.name || otherOrgBuilding.organization})`);
      const crossOrgUnit = await req("/units", {
        method: "POST",
        body: {
          building: otherOrgBuilding._id,
          unitNumber: `U-XORG-${Date.now().toString().slice(-4)}`,
          floor: 1,
          type: "APARTMENT",
          status: "VACANT",
        },
      }, mgrCookie);

      assert(crossOrgUnit.status === 403, "Manager creating unit in another org rejected with HTTP 403 Forbidden");
    }

    // -------------------------------------------------------------
    // 6. Duplicate Unit Prevention
    // -------------------------------------------------------------
    console.log("\n[TEST 6]: Duplicate Unit Number Prevention");
    const dupUnit = await req("/units", {
      method: "POST",
      body: {
        building: adminBuilding._id,
        unitNumber: uniqueUnitNum1,
        floor: 3,
        type: "APARTMENT",
        status: "VACANT",
      },
    }, adminCookie);

    assert(dupUnit.status === 409, "Duplicate unit in same building rejected with HTTP 409 Conflict");

    // -------------------------------------------------------------
    // 7. Invalid Input Handling (No 500 errors)
    // -------------------------------------------------------------
    console.log("\n[TEST 7]: Controlled Validation Error Handling");

    // Missing unit number
    const noNum = await req("/units", {
      method: "POST",
      body: { building: adminBuilding._id, unitNumber: "" },
    }, adminCookie);
    assert(noNum.status === 400, "Missing unit number returns HTTP 400 Bad Request");

    // Invalid building ID format
    const badBld = await req("/units", {
      method: "POST",
      body: { building: "invalid-id-format", unitNumber: "U-123" },
    }, adminCookie);
    assert(badBld.status === 400, "Malformed building ID returns HTTP 400 Bad Request");

    // Negative floor number
    const negFloor = await req("/units", {
      method: "POST",
      body: { building: adminBuilding._id, unitNumber: "U-NEG", floor: -5 },
    }, adminCookie);
    assert(negFloor.status === 400, "Negative floor number returns HTTP 400 Bad Request");

    // -------------------------------------------------------------
    // 8. Unit Update & Delete Lifecycle
    // -------------------------------------------------------------
    console.log("\n[TEST 8]: Unit Update & Delete Operations");

    // Update
    const updateRes = await req(`/units/${createdUnit1._id}`, {
      method: "PUT",
      body: {
        status: "OCCUPIED",
        type: "RETAIL",
      },
    }, adminCookie);
    assert(updateRes.status === 200, "PUT /api/units/:id updates unit successfully");
    assert(updateRes.data.unit?.status === "OCCUPIED", "Updated status is OCCUPIED");
    assert(updateRes.data.unit?.type === "RETAIL", "Updated type is RETAIL");

    // Delete
    const delRes = await req(`/units/${createdUnit1._id}`, {
      method: "DELETE",
    }, adminCookie);
    assert(delRes.status === 200, "DELETE /api/units/:id deletes unit successfully");

    // Verify gone
    const verifyDel = await req(`/units/${createdUnit1._id}`, {}, adminCookie);
    assert(verifyDel.status === 404, "Deleted unit returns HTTP 404 Not Found");

    console.log("\n===================================================================");
    console.log(`🎉 ALL UNIT CRUD & AUTH CHECKS PASSED: ${results.passed}/${results.total} ASSERTIONS (100%)`);
    console.log("===================================================================");
  } catch (err) {
    console.error("Unit test suite error:", err);
    process.exit(1);
  }
}

runUnitCrudAndAuthTest();
