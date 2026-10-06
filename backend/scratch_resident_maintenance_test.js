const API_BASE = "https://greengrid-gd7q.onrender.com/api";

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

async function runMaintenanceFlowTest() {
  console.log("===================================================================");
  console.log("🛠️ GREENGRID RESIDENT MAINTENANCE WORKFLOW & RBAC VERIFICATION");
  console.log("===================================================================");

  try {
    // -------------------------------------------------------------
    // 1. Resident Login & Session Retrieval
    // -------------------------------------------------------------
    console.log("\n[STEP 1]: Resident Login & GET /api/auth/me Verification");
    const resLogin = await req("/auth/login", {
      method: "POST",
      body: {
        email: "resident@greengrid.test",
        password: "ResidentPassword123!",
      },
    });
    assert(resLogin.status === 200, "Resident logged in successfully (HTTP 200)");
    const resCookie = resLogin.cookie;

    const resMe = await req("/auth/me", {}, resCookie);
    assert(resMe.status === 200, "GET /api/auth/me succeeds");
    assert(resMe.data.user?.role === "UNIT_USER", "Role is UNIT_USER");
    assert(!!resMe.data.user?.unit, "Resident has assigned unit");
    const residentUnitId = resMe.data.user?.unit?._id || resMe.data.user?.unit;
    console.log(`  🏢 Resident unit: ${resMe.data.user?.unit?.unitNumber || residentUnitId}`);

    // -------------------------------------------------------------
    // 2. Resident Creates Maintenance Request (Exact User Request Test)
    // -------------------------------------------------------------
    console.log("\n[STEP 2]: Resident Creates Maintenance Request via POST /api/maintenance");
    const title = "Test Water Leakage";
    const description = "Testing maintenance request creation.";
    const priority = "MEDIUM";

    // Test without explicit unitId (auto-resolved from req.user.unit)
    const createRes1 = await req("/maintenance", {
      method: "POST",
      body: {
        title,
        description,
        priority,
      },
    }, resCookie);

    assert(createRes1.status === 201, "POST /api/maintenance (auto-resolved unit) returns HTTP 201 Created");
    const ticket1 = createRes1.data.request;
    assert(ticket1.title === title, `Ticket title matches: '${ticket1.title}'`);
    assert(ticket1.description === description, `Ticket description matches`);
    assert(ticket1.priority === "MEDIUM", `Ticket priority is MEDIUM`);
    assert(ticket1.status === "OPEN", `Initial ticket status is OPEN`);
    assert(ticket1.createdBy?._id === resMe.data.user._id, `createdBy matches resident ObjectId`);
    assert(ticket1.unit?._id === residentUnitId || ticket1.unit === residentUnitId, `Assigned unit matches resident unit`);

    // Test with explicit unitId in payload (as sent from enhanced frontend)
    const createRes2 = await req("/maintenance", {
      method: "POST",
      body: {
        unitId: residentUnitId,
        title: "Test AC Circuit Breaker Trip",
        description: "Circuit breaker trips when AC starts in Unit.",
        priority: "HIGH",
      },
    }, resCookie);
    assert(createRes2.status === 201, "POST /api/maintenance (explicit unitId) returns HTTP 201 Created");
    const ticket2 = createRes2.data.request;

    // -------------------------------------------------------------
    // 3. Resident Retrieves Own Requests (GET /api/maintenance/my)
    // -------------------------------------------------------------
    console.log("\n[STEP 3]: Resident Retrieves Maintenance List");
    const myTicketsRes = await req("/maintenance/my", {}, resCookie);
    assert(myTicketsRes.status === 200, "GET /api/maintenance/my returns HTTP 200");
    const foundTicket = myTicketsRes.data.requests?.find((r) => r._id === ticket1._id);
    assert(!!foundTicket, "Newly created ticket appears in resident's maintenance list");

    // -------------------------------------------------------------
    // 4. Security & RBAC Checks
    // -------------------------------------------------------------
    console.log("\n[STEP 4]: Maintenance Security & RBAC Enforcement");

    // Unauthenticated request
    const unauthCreate = await req("/maintenance", {
      method: "POST",
      body: { title: "Unauth", description: "Desc", priority: "LOW" },
    });
    assert(unauthCreate.status === 401, "Unauthenticated POST /api/maintenance returns HTTP 401 Unauthorized");

    // Resident attempting to create ticket for someone else's unit
    const otherUnitId = "6ab4d571d4ce0e2f89d70484"; // Unit A-201 in Green Valley Residency
    const crossUnitCreate = await req("/maintenance", {
      method: "POST",
      body: {
        unitId: otherUnitId,
        title: "Illegal Ticket",
        description: "Attempting to create ticket for another unit",
        priority: "LOW",
      },
    }, resCookie);
    assert(crossUnitCreate.status === 403, "Resident creating ticket for another unit rejected with HTTP 403 Forbidden");

    // -------------------------------------------------------------
    // 5. Complete Maintenance Lifecycle (OPEN -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> CLOSED)
    // -------------------------------------------------------------
    console.log("\n[STEP 5]: Full Lifecycle Progression");

    // Manager Login
    const mgrLogin = await req("/auth/login", {
      method: "POST",
      body: { email: "manager@greengrid.test", password: "ManagerTest123!" },
    });
    const mgrCookie = mgrLogin.cookie;

    // Technician Login
    const techLogin = await req("/auth/login", {
      method: "POST",
      body: { email: "technician@greengrid.test", password: "TechPassword123!" },
    });
    const techCookie = techLogin.cookie;
    const techMe = await req("/auth/me", {}, techCookie);
    const techId = techMe.data.user._id;

    // Manager assigns technician
    const assignRes = await req(`/maintenance/${ticket1._id}/assign`, {
      method: "PUT",
      body: {
        technicianId: techId,
        notes: "Please inspect water pipe and pressure regulator.",
      },
    }, mgrCookie);
    assert(assignRes.status === 200, "Manager assigns technician (HTTP 200)");
    assert(assignRes.data.request?.status === "ASSIGNED", "Ticket status is now ASSIGNED");

    // Technician sets IN_PROGRESS
    const inProgRes = await req(`/maintenance/${ticket1._id}`, {
      method: "PUT",
      body: { status: "IN_PROGRESS" },
    }, techCookie);
    assert(inProgRes.status === 200 && inProgRes.data.request?.status === "IN_PROGRESS", "Technician marks ticket IN_PROGRESS");

    // Technician sets RESOLVED with notes
    const resolveRes = await req(`/maintenance/${ticket1._id}`, {
      method: "PUT",
      body: {
        status: "RESOLVED",
        resolutionNotes: "Replaced pipe washer and verified water flow.",
      },
    }, techCookie);
    assert(resolveRes.status === 200 && resolveRes.data.request?.status === "RESOLVED", "Technician marks ticket RESOLVED with notes");

    // Manager/Admin closes ticket
    const closeRes = await req(`/maintenance/${ticket1._id}`, {
      method: "PUT",
      body: { status: "CLOSED" },
    }, mgrCookie);
    assert(closeRes.status === 200 && closeRes.data.request?.status === "CLOSED", "Manager marks ticket CLOSED");

    console.log("\n===================================================================");
    console.log(`🎉 RESIDENT MAINTENANCE VERIFICATION PASSED: ${results.passed}/${results.total} ASSERTIONS PASSED (100%)`);
    console.log("===================================================================");
  } catch (err) {
    console.error("Maintenance test error:", err);
    process.exit(1);
  }
}

runMaintenanceFlowTest();
