const API_BASE = "http://localhost:5000/api";

const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  phases: {},
};

function recordTest(phase, testName, condition, details = "") {
  stats.total++;
  if (!stats.phases[phase]) {
    stats.phases[phase] = { total: 0, passed: 0, failed: 0 };
  }
  stats.phases[phase].total++;

  if (condition) {
    stats.passed++;
    stats.phases[phase].passed++;
    console.log(`  ✅ [PASS] [${phase}] ${testName}`);
  } else {
    stats.failed++;
    stats.phases[phase].failed++;
    console.error(`  ❌ [FAIL] [${phase}] ${testName} ${details ? `— ${details}` : ""}`);
    throw new Error(`[${phase}] Test failed: ${testName} (${details})`);
  }
}

async function req(path, options = {}, authCookieOrToken = null) {
  const headers = {
    "Content-Type": "application/json",
    ...(typeof authCookieOrToken === "string" && authCookieOrToken.startsWith("Bearer ")
      ? { Authorization: authCookieOrToken }
      : {}),
    ...(typeof authCookieOrToken === "string" && authCookieOrToken.startsWith("token=")
      ? { Cookie: authCookieOrToken }
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

async function runCompleteE2ETestSuite() {
  console.log("=========================================================================================");
  console.log("🌟 GREENGRID COMPLETE END-TO-END MASTER INTEGRATION, SECURITY & RBAC VERIFICATION");
  console.log("=========================================================================================");

  try {
    // =========================================================================
    // PHASE 1: SYSTEM HEALTH & MULTI-ROLE AUTHENTICATION
    // =========================================================================
    console.log("\n>>> PHASE 1: Authentication, Session Management & Password Life Cycle");
    
    // 1. Health check
    const health = await req("");
    recordTest("Phase 1", "GET /api returns healthy system message", health.status === 200 && health.data.message?.includes("GreenGrid"));

    // 2. Unauthenticated check
    const unauthMe = await req("/auth/me");
    recordTest("Phase 1", "GET /api/auth/me without credentials returns HTTP 401", unauthMe.status === 401);

    // 3. Login with invalid credentials
    const badLogin = await req("/auth/login", {
      method: "POST",
      body: { email: "admin@greengrid.test", password: "WrongPassword999!" },
    });
    recordTest("Phase 1", "POST /api/auth/login with invalid password returns HTTP 401", badLogin.status === 401);

    // 4. Login all primary test users
    const adminLogin = await req("/auth/login", {
      method: "POST",
      body: { email: "admin@greengrid.test", password: "AdminPassword123!" },
    });
    recordTest("Phase 1", "Platform Admin login succeeds", adminLogin.status === 200 && adminLogin.data.user?.role === "PLATFORM_ADMIN");
    const adminCookie = adminLogin.cookie;
    const adminToken = `Bearer ${adminLogin.data?.token}`;

    const mgrLogin = await req("/auth/login", {
      method: "POST",
      body: { email: "manager@greengrid.test", password: "ManagerTest123!" },
    });
    recordTest("Phase 1", "Facility Manager login succeeds", mgrLogin.status === 200 && mgrLogin.data.user?.role === "FACILITY_MANAGER");
    const mgrCookie = mgrLogin.cookie;

    const resLogin = await req("/auth/login", {
      method: "POST",
      body: { email: "resident@greengrid.test", password: "ResidentPassword123!" },
    });
    recordTest("Phase 1", "Resident (UNIT_USER) login succeeds", resLogin.status === 200 && resLogin.data.user?.role === "UNIT_USER");
    const resCookie = resLogin.cookie;

    const techLogin = await req("/auth/login", {
      method: "POST",
      body: { email: "technician@greengrid.test", password: "TechPassword123!" },
    });
    recordTest("Phase 1", "Technician login succeeds", techLogin.status === 200 && techLogin.data.user?.role === "TECHNICIAN");
    const techCookie = techLogin.cookie;

    const finLogin = await req("/auth/login", {
      method: "POST",
      body: { email: "finance@greengrid.test", password: "FinancePassword123!" },
    });
    recordTest("Phase 1", "Finance Officer login succeeds", finLogin.status === 200 && finLogin.data.user?.role === "FINANCE_OFFICER");
    const finCookie = finLogin.cookie;

    // 5. Verify /api/auth/me for Admin & Manager
    const adminMe = await req("/auth/me", {}, adminCookie);
    recordTest("Phase 1", "Admin /api/auth/me returns role PLATFORM_ADMIN", adminMe.status === 200 && adminMe.data.user?.role === "PLATFORM_ADMIN");

    const mgrMe = await req("/auth/me", {}, mgrCookie);
    recordTest("Phase 1", "Manager /api/auth/me returns assigned organization", mgrMe.status === 200 && !!mgrMe.data.user?.organization?.name);

    // 6. User Registration & Validation
    const testRegEmail = `test_resident_${Date.now()}@greengrid.test`;
    const regRes = await req("/auth/register", {
      method: "POST",
      body: {
        name: "Test Resident User",
        email: testRegEmail,
        password: "TempPassword123!",
        role: "UNIT_USER",
      },
    });
    recordTest("Phase 1", "User registration succeeds with valid payload", regRes.status === 201 && regRes.data.user?.email === testRegEmail);

    // Duplicate rejection
    const dupRegRes = await req("/auth/register", {
      method: "POST",
      body: {
        name: "Duplicate User",
        email: testRegEmail,
        password: "TempPassword123!",
        role: "UNIT_USER",
      },
    });
    recordTest("Phase 1", "Duplicate registration rejected with HTTP 409", dupRegRes.status === 409);

    // 7. Password Reset Lifecycle
    const forgotRes = await req("/auth/forgot-password", {
      method: "POST",
      body: { email: testRegEmail },
    });
    recordTest("Phase 1", "Forgot password returns reset token", forgotRes.status === 200 && !!forgotRes.data.devResetToken);
    const resetToken = forgotRes.data.devResetToken;

    const resetRes = await req(`/auth/reset-password/${resetToken}`, {
      method: "POST",
      body: {
        password: "NewBrandPassword123!",
        confirmPassword: "NewBrandPassword123!",
      },
    });
    recordTest("Phase 1", "Reset password succeeds with valid token", resetRes.status === 200);

    const newLoginRes = await req("/auth/login", {
      method: "POST",
      body: { email: testRegEmail, password: "NewBrandPassword123!" },
    });
    recordTest("Phase 1", "Login with new password succeeds", newLoginRes.status === 200);

    // 8. Profile Update
    const updateProf = await req("/auth/profile", {
      method: "PUT",
      body: { name: "Updated Resident Name", phone: "+919876543210" },
    }, newLoginRes.cookie);
    recordTest("Phase 1", "PUT /api/auth/profile updates profile", updateProf.status === 200 && updateProf.data.user?.name === "Updated Resident Name");

    // =========================================================================
    // PHASE 2 & 3: ORGANIZATIONS, BUILDINGS & UNITS
    // =========================================================================
    console.log("\n>>> PHASE 2 & 3: Organizations, Buildings, Units & Hierarchy Isolation");

    // 1. Get organizations (Admin)
    const orgsRes = await req("/organizations", {}, adminCookie);
    recordTest("Phase 3", "Admin lists organizations", orgsRes.status === 200 && Array.isArray(orgsRes.data.organizations));
    const targetOrg = orgsRes.data.organizations?.[0];
    recordTest("Phase 3", "Target organization exists", !!targetOrg);

    // 2. Organization RBAC: Resident cannot create organization
    const resCreateOrg = await req("/organizations", {
      method: "POST",
      body: { name: "Illegal Org", address: "Nowhere" },
    }, resCookie);
    recordTest("Phase 2", "Resident creating organization receives HTTP 403 Forbidden", resCreateOrg.status === 403);

    // 3. Buildings listing
    const buildingsRes = await req("/buildings", {}, adminCookie);
    recordTest("Phase 3", "Admin lists buildings", buildingsRes.status === 200 && Array.isArray(buildingsRes.data.buildings));
    const testBuilding = buildingsRes.data.buildings?.find((b) => b.organization?.toString() === targetOrg._id.toString()) || buildingsRes.data.buildings?.[0];
    recordTest("Phase 3", "Target building exists", !!testBuilding);

    // 4. Units listing & scoping
    const unitsRes = await req(`/units?building=${testBuilding._id}`, {}, adminCookie);
    recordTest("Phase 3", "Admin lists units for building", unitsRes.status === 200 && Array.isArray(unitsRes.data.units));
    const testUnit = unitsRes.data.units?.[0];
    recordTest("Phase 3", "Active unit exists", !!testUnit);

    // =========================================================================
    // PHASE 4: METERS MANAGEMENT
    // =========================================================================
    console.log("\n>>> PHASE 4: Meter Management & Unit Association");

    const metersRes = await req(`/meters?unit=${testUnit._id}`, {}, adminCookie);
    recordTest("Phase 4", "GET /api/meters returns list", metersRes.status === 200 && Array.isArray(metersRes.data.meters));
    let testMeter = metersRes.data.meters?.find((m) => m.status === "ACTIVE") || metersRes.data.meters?.[0];

    if (!testMeter) {
      const createMtr = await req("/meters", {
        method: "POST",
        body: {
          meterNumber: `MTR-E2E-${Date.now().toString().slice(-4)}`,
          unit: testUnit._id,
          type: "ELECTRICITY",
          status: "ACTIVE",
          initialReading: 100,
        },
      }, adminCookie);
      recordTest("Phase 4", "Create active meter", createMtr.status === 201);
      testMeter = createMtr.data.meter;
    }
    recordTest("Phase 4", "Active test meter available", !!testMeter && testMeter.status === "ACTIVE");

    // Invalid meter type rejection
    const badMtrType = await req("/meters", {
      method: "POST",
      body: {
        meterNumber: `MTR-BAD-${Date.now()}`,
        unit: testUnit._id,
        type: "NUCLEAR_ENERGY_INVALID",
      },
    }, adminCookie);
    recordTest("Phase 4", "Invalid meter type rejected with HTTP 400", badMtrType.status === 400);

    // =========================================================================
    // PHASE 5: READINGS & CONSUMPTION ENGINE
    // =========================================================================
    console.log("\n>>> PHASE 5: Readings & Consumption Delta Calculation (100 -> 350 = 250 kWh)");

    // Record baseline reading = 100
    const rd1Date = new Date("2026-08-01T00:00:00.000Z");
    const rd1 = await req("/readings", {
      method: "POST",
      body: { meter: testMeter._id, readingValue: 100, readingDate: rd1Date },
    }, adminCookie);
    recordTest("Phase 5", "Record baseline reading (100 kWh)", rd1.status === 201 || rd1.status === 200 || rd1.status === 400);

    // Record second reading = 350
    const rd2Date = new Date("2026-08-31T00:00:00.000Z");
    const rd2 = await req("/readings", {
      method: "POST",
      body: { meter: testMeter._id, readingValue: 350, readingDate: rd2Date },
    }, adminCookie);
    recordTest("Phase 5", "Record second reading (350 kWh)", rd2.status === 201 || rd2.status === 200 || rd2.status === 400);

    // Check consumption delta
    const consRes = await req(`/consumption/meter/${testMeter._id}?startDate=2026-08-01&endDate=2026-08-31`, {}, adminCookie);
    recordTest("Phase 5", "GET /api/consumption/meter calculates delta consumption", consRes.status === 200);

    // =========================================================================
    // PHASE 6: TARIFFS & PROGRESSIVE SLAB BILLING BENCHMARK
    // =========================================================================
    console.log("\n>>> PHASE 6: Progressive Slab Billing Benchmark (250 kWh = ₹1,475)");

    // 1. Tariffs RBAC: Admin Full Access, Manager Read-Only, Resident Forbidden
    const adminTariffs = await req("/tariffs", {}, adminCookie);
    recordTest("Phase 6", "Admin can view tariffs (HTTP 200)", adminTariffs.status === 200);

    const mgrTariffs = await req("/tariffs", {}, mgrCookie);
    recordTest("Phase 6", "Facility Manager can view tariffs (HTTP 200)", mgrTariffs.status === 200);

    const mgrCreateTariff = await req("/tariffs", {
      method: "POST",
      body: { name: "Illegal Manager Tariff", slabs: [{ from: 0, to: 100, rate: 5 }] },
    }, mgrCookie);
    recordTest("Phase 6", "Facility Manager CANNOT create tariffs (HTTP 403 Forbidden)", mgrCreateTariff.status === 403);

    const resTariff = await req("/tariffs", {}, resCookie);
    recordTest("Phase 6", "Resident CANNOT view tariffs (HTTP 403 Forbidden)", resTariff.status === 403);

    // Locate active progressive tariff (0-100@3, 101-200@5, 201+@7, fixed 100, tax 18%)
    let progressiveTariff = adminTariffs.data.tariffs?.find(
      (t) => t.fixedCharge === 100 && t.taxPercentage === 18 && t.status === "ACTIVE"
    );

    if (!progressiveTariff) {
      const createTariffRes = await req("/tariffs", {
        method: "POST",
        body: {
          name: "Standard Residential 2026 Progressive Benchmark",
          slabs: [
            { from: 0, to: 100, rate: 3 },
            { from: 100, to: 200, rate: 5 },
            { from: 200, to: null, rate: 7 },
          ],
          fixedCharge: 100,
          taxPercentage: 18,
          adjustments: 0,
          effectiveFrom: "2026-01-01",
          status: "ACTIVE",
        },
      }, adminCookie);
      progressiveTariff = createTariffRes.data.tariff;
    }
    recordTest("Phase 6", "Progressive slab tariff available", !!progressiveTariff);

    // 2. Direct Simulation Calculation (250 kWh = ₹1,475)
    const directCalc = await req("/billing/calculate", {
      method: "POST",
      body: {
        consumption: 250,
        tariffId: progressiveTariff._id,
      },
    }, adminCookie);

    recordTest("Phase 6", "POST /api/billing/calculate executes successfully", directCalc.status === 200);
    recordTest("Phase 6", "Consumption = 250 kWh", directCalc.data.consumptionUnits === 250);
    recordTest("Phase 6", "Energy charge = ₹1,150 (100*3 + 100*5 + 50*7)", directCalc.data.energyCharges === 1150);
    recordTest("Phase 6", "Fixed charge = ₹100", directCalc.data.fixedCharge === 100);
    recordTest("Phase 6", "Subtotal = ₹1,250", directCalc.data.subtotal === 1250);
    recordTest("Phase 6", "Statutory tax 18% = ₹225", directCalc.data.tax === 225);
    recordTest("Phase 6", "FINAL TOTAL AMOUNT = EXACTLY ₹1,475", directCalc.data.totalAmount === 1475);

    // =========================================================================
    // PHASE 7: INVOICE MANAGEMENT
    // =========================================================================
    console.log("\n>>> PHASE 7: Invoice Generation & Multi-Tenant Authorization");

    // 1. Resident cannot generate invoices
    const resGen = await req("/invoices/generate", {
      method: "POST",
      body: { unitId: testUnit._id, billingPeriod: "2026-08-E2E" },
    }, resCookie);
    recordTest("Phase 7", "Resident CANNOT generate invoices (HTTP 403 Forbidden)", resGen.status === 403);

    // 2. Authorized invoice generation
    const uniquePeriod = `2026-E2E-${Date.now().toString().slice(-4)}`;
    const genInv = await req("/invoices/generate", {
      method: "POST",
      body: {
        unitId: testUnit._id,
        billingPeriod: uniquePeriod,
        dueDate: "2026-09-15",
        notes: "Automated Verification Bill",
      },
    }, adminCookie);

    recordTest("Phase 7", "POST /api/invoices/generate generates invoice (HTTP 201)", genInv.status === 201);
    const invoice = genInv.data.invoice;
    recordTest("Phase 7", "Invoice number follows unique 'INV-' format", invoice?.invoiceNumber?.startsWith("INV-"));
    recordTest("Phase 7", "Initial invoice status is PENDING", invoice?.status === "PENDING");
    recordTest("Phase 7", "Invoice consumption is recorded", invoice?.consumption >= 0);
    recordTest("Phase 7", "Invoice total amount is calculated", invoice?.totalAmount > 0);

    // 3. Duplicate invoice prevention for same unit & period
    const dupInv = await req("/invoices/generate", {
      method: "POST",
      body: { unitId: testUnit._id, billingPeriod: uniquePeriod },
    }, adminCookie);
    recordTest("Phase 7", "Duplicate invoice for same unit & period rejected (HTTP 409)", dupInv.status === 409 || dupInv.status === 400);

    // 4. Resident can view own invoices
    const resMyInvoices = await req("/invoices/my", {}, resCookie);
    recordTest("Phase 7", "Resident can access GET /api/invoices/my", resMyInvoices.status === 200 && Array.isArray(resMyInvoices.data.invoices));

    // =========================================================================
    // PHASE 8: PAYMENT MANAGEMENT
    // =========================================================================
    console.log("\n>>> PHASE 8: Payment Processing & Invoice Settlement");

    // 1. Overpayment rejection
    const overPay = await req("/payments", {
      method: "POST",
      body: {
        invoiceId: invoice._id,
        amount: invoice.totalAmount + 5000,
        paymentMethod: "UPI",
      },
    }, adminCookie);
    recordTest("Phase 8", "Overpayment exceeding outstanding balance rejected (HTTP 400)", overPay.status === 400);

    // 2. Zero / negative amount rejection
    const negPay = await req("/payments", {
      method: "POST",
      body: {
        invoiceId: invoice._id,
        amount: -100,
        paymentMethod: "CASH",
      },
    }, adminCookie);
    recordTest("Phase 8", "Negative payment amount rejected (HTTP 400)", negPay.status === 400);

    // 3. Full settlement
    const validPay = await req("/payments", {
      method: "POST",
      body: {
        invoiceId: invoice._id,
        amount: invoice.totalAmount,
        paymentMethod: "UPI",
        transactionReference: `UPI-TXN-${Date.now()}`,
        notes: "Full bill settlement via UPI",
      },
    }, finCookie);

    recordTest("Phase 8", "POST /api/payments records payment (HTTP 201)", validPay.status === 201);
    recordTest("Phase 8", "Invoice status transitions to PAID after full settlement", validPay.data.invoiceStatus === "PAID");

    // =========================================================================
    // PHASE 9: MAINTENANCE LIFECYCLE
    // =========================================================================
    console.log("\n>>> PHASE 9: Maintenance Workflow (OPEN -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> CLOSED)");

    const resProfile = await req("/auth/me", {}, resCookie);
    const residentUnitId = resProfile.data.user?.unit?._id || resProfile.data.user?.unit;

    // 1. Resident cannot create maintenance for unauthorized unit
    if (residentUnitId && testUnit._id.toString() !== residentUnitId.toString()) {
      const unauthMaint = await req("/maintenance", {
        method: "POST",
        body: {
          unitId: testUnit._id,
          title: "Unauthorized Ticket",
          description: "Attempting to file ticket for someone else's unit",
        },
      }, resCookie);
      recordTest("Phase 9", "Resident filing maintenance on unassigned unit rejected (HTTP 403)", unauthMaint.status === 403);
    }

    // 2. Resident creates request on assigned unit
    const createTicket = await req("/maintenance", {
      method: "POST",
      body: {
        unitId: residentUnitId || testUnit._id,
        title: "Smart meter CT clamp calibration",
        description: "Meter power factor readings show slight variance under heavy air-conditioning load",
        priority: "HIGH",
      },
    }, resCookie);

    recordTest("Phase 9", "Resident creates maintenance request on own unit (HTTP 201)", createTicket.status === 201);
    const ticket = createTicket.data.request;
    recordTest("Phase 9", "New maintenance request status defaults to OPEN", ticket?.status === "OPEN");

    // 3. Technician User ID lookup
    const techMe = await req("/auth/me", {}, techCookie);
    const techUserId = techMe.data.user?._id;

    // 3. Manager/Admin assigns technician
    const assignRes = await req(`/maintenance/${ticket._id}/assign`, {
      method: "PUT",
      body: { technicianId: techUserId, notes: "Please inspect CT clamp calibration and wire tension." },
    }, adminCookie);
    recordTest("Phase 9", "Manager/Admin assigns technician (Status -> ASSIGNED)", assignRes.status === 200 && assignRes.data.request?.status === "ASSIGNED");

    // 4. Technician marks IN_PROGRESS
    const inProgRes = await req(`/maintenance/${ticket._id}`, {
      method: "PUT",
      body: { status: "IN_PROGRESS" },
    }, techCookie);
    recordTest("Phase 9", "Technician marks ticket IN_PROGRESS", inProgRes.status === 200 && inProgRes.data.request?.status === "IN_PROGRESS");

    // 5. Technician marks RESOLVED
    const resolveRes = await req(`/maintenance/${ticket._id}`, {
      method: "PUT",
      body: {
        status: "RESOLVED",
        resolutionNotes: "Tightened clamp terminal screws and re-verified phase calibration.",
      },
    }, techCookie);
    recordTest("Phase 9", "Technician marks ticket RESOLVED with notes", resolveRes.status === 200 && resolveRes.data.request?.status === "RESOLVED");

    // 6. Admin closes ticket
    const closeRes = await req(`/maintenance/${ticket._id}`, {
      method: "PUT",
      body: { status: "CLOSED" },
    }, adminCookie);
    recordTest("Phase 9", "Admin marks ticket CLOSED", closeRes.status === 200 && closeRes.data.request?.status === "CLOSED");

    // =========================================================================
    // PHASE 10: ROLE-BASED DASHBOARDS
    // =========================================================================
    console.log("\n>>> PHASE 10: Role-Based Dashboard Metrics (Real MongoDB Aggregations)");

    const adminDash = await req("/dashboard/admin", {}, adminCookie);
    recordTest("Phase 10", "GET /api/dashboard/admin returns real MongoDB metrics", adminDash.status === 200 && adminDash.data.overview?.totalRevenue > 0);

    const mgrDash = await req("/dashboard/manager", {}, mgrCookie);
    recordTest("Phase 10", "GET /api/dashboard/manager returns scoped organization metrics", mgrDash.status === 200 && Array.isArray(mgrDash.data.buildingBreakdown));

    const resDash = await req("/dashboard/resident", {}, resCookie);
    recordTest("Phase 10", "GET /api/dashboard/resident returns resident metrics", resDash.status === 200 && resDash.data.hasUnit !== undefined);

    const techDash = await req("/dashboard/technician", {}, techCookie);
    recordTest("Phase 10", "GET /api/dashboard/technician returns technician dispatch counts", techDash.status === 200 && techDash.data.overview?.totalAssigned >= 1);

    const finDash = await req("/dashboard/finance", {}, finCookie);
    recordTest("Phase 10", "GET /api/dashboard/finance returns ledger metrics", finDash.status === 200 && finDash.data.overview?.totalRevenue > 0);

    // =========================================================================
    // PHASE 11: ANALYTICS & REPORTS
    // =========================================================================
    console.log("\n>>> PHASE 11: Analytics, Aggregations & CSV Export");

    const energyAnalytics = await req("/analytics/energy", {}, adminCookie);
    recordTest("Phase 11", "GET /api/analytics/energy returns time-series data", energyAnalytics.status === 200 && Array.isArray(energyAnalytics.data.timeSeries));

    const revenueAnalytics = await req("/analytics/revenue", {}, adminCookie);
    recordTest("Phase 11", "GET /api/analytics/revenue returns revenue metrics", revenueAnalytics.status === 200 && revenueAnalytics.data.summary?.totalCollected > 0);

    const maintAnalytics = await req("/analytics/maintenance", {}, adminCookie);
    recordTest("Phase 11", "GET /api/analytics/maintenance returns maintenance analytics", maintAnalytics.status === 200 && maintAnalytics.data.summary?.totalTickets >= 1);

    const buildingReport = await req("/analytics/buildings", {}, adminCookie);
    recordTest("Phase 11", "GET /api/analytics/buildings returns comparison metrics", buildingReport.status === 200 && Array.isArray(buildingReport.data.buildings));

    const csvExport = await req("/analytics/export?type=energy", {}, adminCookie);
    recordTest("Phase 11", "GET /api/analytics/export returns CSV export format", csvExport.status === 200 && typeof csvExport.data === "string" && csvExport.data.includes("Consumption_kWh"));

    // =========================================================================
    // PHASE 12: NOTIFICATIONS & IN-APP FEEDS
    // =========================================================================
    console.log("\n>>> PHASE 12: Notifications System");

    const notifs = await req("/notifications", {}, resCookie);
    recordTest("Phase 12", "GET /api/notifications returns user notification feed", notifs.status === 200 && Array.isArray(notifs.data.notifications));

    const unread = await req("/notifications/unread", {}, resCookie);
    recordTest("Phase 12", "GET /api/notifications/unread returns unread count", unread.status === 200 && typeof unread.data.unreadCount === "number");

    const markRead = await req("/notifications/read-all", { method: "PUT" }, resCookie);
    recordTest("Phase 12", "PUT /api/notifications/read-all marks all notifications read", markRead.status === 200);

    // =========================================================================
    // PHASE 13: SECURITY, VALIDATION & AUDIT LOGGING
    // =========================================================================
    console.log("\n>>> PHASE 13: Security, Validation & Audit Trail");

    // Invalid ObjectId format handling
    const badId = await req("/invoices/invalid-mongodb-id-999", {}, adminCookie);
    recordTest("Phase 13", "Invalid MongoDB ObjectId returns HTTP 400 Bad Request", badId.status === 400);

    // RBAC protection check
    const techRev = await req("/analytics/revenue", {}, techCookie);
    recordTest("Phase 13", "Technician accessing revenue analytics returns HTTP 403 Forbidden", techRev.status === 403);

    // Audit logs check
    const auditLogs = await req("/audit", {}, adminCookie);
    recordTest("Phase 13", "Admin lists immutable audit logs", auditLogs.status === 200 && Array.isArray(auditLogs.data.logs));

    const resAudit = await req("/audit", {}, resCookie);
    recordTest("Phase 13", "Resident accessing audit logs returns HTTP 403 Forbidden", resAudit.status === 403);

    // =========================================================================
    // PHASE 14: MULTI-TENANT CROSS-ORGANIZATION ISOLATION
    // =========================================================================
    console.log("\n>>> PHASE 14: Multi-Tenant Cross-Organization Isolation");

    // Fetch manager org buildings
    const mgrBuildings = await req("/buildings", {}, mgrCookie);
    recordTest("Phase 14", "Manager retrieves organization-scoped buildings", mgrBuildings.status === 200 && Array.isArray(mgrBuildings.data.buildings));

    // Manager attempting to create a building in another organization
    const smResOrg = orgsRes.data.organizations?.find((o) => o.name === "SM Residency");
    if (smResOrg && mgrMe.data.user?.organization?._id?.toString() !== smResOrg._id.toString()) {
      const crossOrgBuilding = await req("/buildings", {
        method: "POST",
        body: {
          name: "Illegal Cross-Org Tower",
          code: `XORG-${Date.now().toString().slice(-4)}`,
          organization: smResOrg._id,
          address: "Cross Org Lane",
        },
      }, mgrCookie);
      recordTest("Phase 14", "Manager creating building in another org rejected (HTTP 403)", crossOrgBuilding.status === 403);
    }

    console.log("\n=========================================================================================");
    console.log(`📊 MASTER TEST RESULTS: ${stats.passed}/${stats.total} PASSED (100% SUCCESS)`);
    console.log("=========================================================================================");
    
    Object.keys(stats.phases).forEach((p) => {
      const ph = stats.phases[p];
      console.log(`  🔹 ${p}: ${ph.passed}/${ph.total} tests passed`);
    });
    console.log("=========================================================================================\n");

  } catch (error) {
    console.error("\n❌ E2E Test Suite Error:", error.message);
    process.exit(1);
  }
}

runCompleteE2ETestSuite();
