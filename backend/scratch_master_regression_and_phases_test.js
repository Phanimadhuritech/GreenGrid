const API_BASE = "https://greengrid-gd7q.onrender.com/api";

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  details: [],
};

const assert = (condition, testName, extraInfo = "") => {
  results.total++;
  if (condition) {
    results.passed++;
    console.log(`  ✅ [PASS] ${testName}`);
    results.details.push({ testName, status: "PASS" });
  } else {
    results.failed++;
    console.error(`  ❌ [FAIL] ${testName} ${extraInfo ? `— ${extraInfo}` : ""}`);
    results.details.push({ testName, status: "FAIL", extraInfo });
  }
};

const req = async (path, options = {}, cookie = null) => {
  const url = `${API_BASE}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(cookie ? { Cookie: cookie } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const setCookie = res.headers.get("set-cookie");
  let extractedCookie = null;
  if (setCookie) {
    extractedCookie = setCookie.split(";")[0];
  }

  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: res.status, ok: res.ok, data, cookie: extractedCookie };
};

async function runMasterTestSuite() {
  console.log("===================================================================");
  console.log("🚀 GREENGRID MASTER REGRESSION & PHASES 7–10 AUTOMATED TEST SUITE");
  console.log("===================================================================");

  let adminCookie = null;
  let managerCookie = null;
  let residentCookie = null;
  let technicianCookie = null;
  let financeCookie = null;

  // -------------------------------------------------------------
  // PART 1: SYSTEM HEALTH & PHASE 2 AUTH / RBAC REGRESSION
  // -------------------------------------------------------------
  console.log("\n[TEST GROUP 1]: System Health & Authentication Regression");
  const health = await req("");
  assert(health.status === 200 && health.data.message?.includes("GreenGrid"), "GET /api Health Check");

  // Admin login
  const adminLogin = await req("/auth/login", {
    method: "POST",
    body: { email: "admin@greengrid.test", password: "AdminPassword123!" },
  });
  adminCookie = adminLogin.cookie;
  assert(adminLogin.status === 200 && adminLogin.data.user?.role === "PLATFORM_ADMIN", "Admin Authentication (PLATFORM_ADMIN)");

  // Manager login
  const managerLogin = await req("/auth/login", {
    method: "POST",
    body: { email: "manager@greengrid.test", password: "ManagerTest123!" },
  });
  managerCookie = managerLogin.cookie;
  assert(managerLogin.status === 200 && managerLogin.data.user?.role === "FACILITY_MANAGER", "Facility Manager Authentication (FACILITY_MANAGER)");

  // Resident login
  const residentLogin = await req("/auth/login", {
    method: "POST",
    body: { email: "resident@greengrid.test", password: "ResidentPassword123!" },
  });
  residentCookie = residentLogin.cookie;
  assert(residentLogin.status === 200 && residentLogin.data.user?.role === "UNIT_USER", "Resident Authentication (UNIT_USER)");

  // Technician login
  const techLogin = await req("/auth/login", {
    method: "POST",
    body: { email: "technician@greengrid.test", password: "TechPassword123!" },
  });
  technicianCookie = techLogin.cookie;
  assert(techLogin.status === 200 && techLogin.data.user?.role === "TECHNICIAN", "Technician Authentication (TECHNICIAN)");

  // Finance Officer login
  const financeLogin = await req("/auth/login", {
    method: "POST",
    body: { email: "finance@greengrid.test", password: "FinancePassword123!" },
  });
  financeCookie = financeLogin.cookie;
  assert(financeLogin.status === 200 && financeLogin.data.user?.role === "FINANCE_OFFICER", "Finance Officer Authentication (FINANCE_OFFICER)");

  // RBAC rejection check: Resident attempting to access Admin organizations endpoint
  const unauthOrg = await req("/organizations", { method: "POST", body: { name: "Hacked" } }, residentCookie);
  assert(unauthOrg.status === 403, "RBAC enforcement: Resident cannot manage organizations (HTTP 403)");

  // -------------------------------------------------------------
  // PART 2: PHASES 3, 4, 5, 6 REGRESSION
  // -------------------------------------------------------------
  console.log("\n[TEST GROUP 2]: Phases 3–6 Infrastructure, Readings & Billing Engine Regression");

  const orgsRes = await req("/organizations", {}, adminCookie);
  assert(orgsRes.status === 200 && Array.isArray(orgsRes.data.organizations), "GET /api/organizations returns list");

  const bldsRes = await req("/buildings", {}, adminCookie);
  assert(bldsRes.status === 200 && Array.isArray(bldsRes.data.buildings), "GET /api/buildings returns list");

  const unitsRes = await req("/units", {}, adminCookie);
  assert(unitsRes.status === 200 && Array.isArray(unitsRes.data.units), "GET /api/units returns list");
  const testUnit = unitsRes.data.units?.[0];
  assert(!!testUnit, "Database contains at least one active unit");

  // Phase 4: Meter lookup
  const metersRes = await req(`/meters?unit=${testUnit._id}`, {}, adminCookie);
  let testMeter = metersRes.data.meters?.[0];
  if (!testMeter) {
    const createMeter = await req("/meters", {
      method: "POST",
      body: {
        meterNumber: `MTR-REG-${Date.now().toString().slice(-4)}`,
        unit: testUnit._id,
        type: "ELECTRICITY",
        status: "ACTIVE",
      },
    }, adminCookie);
    testMeter = createMeter.data.meter;
  }
  assert(!!testMeter && testMeter.status === "ACTIVE", "Active meter assigned to test unit");

  // Phase 5: Meter readings
  const dateA = new Date("2026-08-01T00:00:00.000Z");
  const dateB = new Date("2026-08-31T00:00:00.000Z");
  await req("/readings", {
    method: "POST",
    body: { meter: testMeter._id, readingValue: 2000, readingDate: dateA },
  }, adminCookie);

  await req("/readings", {
    method: "POST",
    body: { meter: testMeter._id, readingValue: 2250, readingDate: dateB },
  }, adminCookie);

  const readingsList = await req(`/readings?meter=${testMeter._id}`, {}, adminCookie);
  assert(readingsList.status === 200 && readingsList.data.readings?.length >= 2, "Meter readings recorded and retrieved");

  // Phase 6: Tariff & Slab Billing Engine Test (250 kWh = ₹1,475)
  console.log("\n  ⚡ Testing Phase 6 Progressive Slab Calculation Engine (250 kWh = ₹1,475)...");
  // Find or create the 250 units = ₹1,475 tariff
  const tariffs = await req("/tariffs", {}, adminCookie);
  let tariffDoc = tariffs.data.tariffs?.find((t) => t.fixedCharge === 100 && t.taxPercentage === 18 && t.status === "ACTIVE");
  if (!tariffDoc) {
    const tCreate = await req("/tariffs", {
      method: "POST",
      body: {
        name: "Standard Progressive Residential 2026",
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
    tariffDoc = tCreate.data.tariff;
  }

  const calcRes = await req("/billing/calculate", {
    method: "POST",
    body: {
      meterId: testMeter._id,
      tariffId: tariffDoc._id,
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    },
  }, adminCookie);

  assert(calcRes.status === 200, "POST /api/billing/calculate executes successfully");
  assert(calcRes.data.consumption === 250, "Calculated consumption equals 250 kWh");
  assert(calcRes.data.energyCharge === 1150, "Energy charge equals ₹1,150 (100*3 + 100*5 + 50*7)");
  assert(calcRes.data.fixedCharge === 100, "Fixed charge equals ₹100");
  assert(calcRes.data.tax === 225, "Tax equals ₹225 (18% of ₹1,250)");
  assert(calcRes.data.totalAmount === 1475, "TOTAL BILL EQUALS EXACTLY ₹1,475");

  // -------------------------------------------------------------
  // PART 3: PHASE 7 INVOICE MANAGEMENT
  // -------------------------------------------------------------
  console.log("\n[TEST GROUP 3]: Phase 7 Invoice Management");

  const billingPeriod = `2026-08-M${Date.now().toString().slice(-4)}`;
  const genInvRes = await req("/invoices/generate", {
    method: "POST",
    body: {
      unitId: testUnit._id,
      billingPeriod,
      dueDate: "2026-09-15",
      notes: "August 2026 Meter Statement",
    },
  }, adminCookie);

  assert(genInvRes.status === 201, "POST /api/invoices/generate creates new invoice (HTTP 201)");
  const inv = genInvRes.data.invoice;
  assert(inv?.invoiceNumber?.startsWith("INV-"), "Invoice number follows unique INV- format");
  assert(inv?.status === "PENDING", "Generated invoice status defaults to PENDING");
  assert(inv?.consumption === 250, "Invoice inherits calculated 250 kWh consumption");
  assert(inv?.totalAmount === 1475, "Invoice inherits calculated total amount of ₹1,475");

  // Duplicate invoice rejection test
  const dupInv = await req("/invoices/generate", {
    method: "POST",
    body: { unitId: testUnit._id, billingPeriod },
  }, adminCookie);
  assert(dupInv.status === 409 || dupInv.status === 400, "Duplicate invoice for same unit & billing period rejected (HTTP 409/400)");

  // Scoping & RBAC tests
  const listInvoices = await req("/invoices", {}, adminCookie);
  assert(listInvoices.status === 200 && listInvoices.data.invoices?.length > 0, "Admin can list all system invoices");

  const techInvoices = await req("/invoices", {}, technicianCookie);
  assert(techInvoices.status === 403, "Technician is forbidden from accessing invoices (HTTP 403)");

  // -------------------------------------------------------------
  // PART 4: PHASE 8 PAYMENT MANAGEMENT
  // -------------------------------------------------------------
  console.log("\n[TEST GROUP 4]: Phase 8 Payment Management");

  // Negative amount rejection
  const negPay = await req("/payments", {
    method: "POST",
    body: { invoiceId: inv._id, amount: -100, paymentMethod: "UPI" },
  }, adminCookie);
  assert(negPay.status === 400, "Negative payment amount rejected (HTTP 400)");

  // Zero amount rejection
  const zeroPay = await req("/payments", {
    method: "POST",
    body: { invoiceId: inv._id, amount: 0, paymentMethod: "UPI" },
  }, adminCookie);
  assert(zeroPay.status === 400, "Zero payment amount rejected (HTTP 400)");

  // Overpayment rejection
  const overPay = await req("/payments", {
    method: "POST",
    body: { invoiceId: inv._id, amount: 99999, paymentMethod: "UPI" },
  }, adminCookie);
  assert(overPay.status === 400, "Overpayment exceeding outstanding balance rejected (HTTP 400)");

  // Valid payment recording
  const validPay = await req("/payments", {
    method: "POST",
    body: {
      invoiceId: inv._id,
      amount: 1475,
      paymentMethod: "UPI",
      transactionReference: `UPI-TXN-${Date.now().toString().slice(-6)}`,
      notes: "Full payment via Google Pay",
    },
  }, financeCookie);

  assert(validPay.status === 201, "POST /api/payments records payment successfully (HTTP 201)");
  assert(validPay.data.invoiceStatus === "PAID", "Invoice status transitions to PAID after full payment");

  // Payment on already paid invoice rejection
  const dupPay = await req("/payments", {
    method: "POST",
    body: { invoiceId: inv._id, amount: 50, paymentMethod: "CASH" },
  }, financeCookie);
  assert(dupPay.status === 400, "Payment on already PAID invoice rejected (HTTP 400)");

  // Payments list
  const payList = await req("/payments", {}, financeCookie);
  assert(payList.status === 200 && payList.data.payments?.length > 0, "Finance officer can list payments ledger");

  // -------------------------------------------------------------
  // PART 5: PHASE 9 MAINTENANCE MANAGEMENT
  // -------------------------------------------------------------
  console.log("\n[TEST GROUP 5]: Phase 9 Maintenance Management");

  // Resident creates ticket for their unit
  const resProfile = await req("/auth/me", {}, residentCookie);
  const residentUnitId = resProfile.data.user?.unit || testUnit._id;

  const createMaint = await req("/maintenance", {
    method: "POST",
    body: {
      unitId: residentUnitId,
      title: "Smart meter display failure",
      description: "LCD screen blank and not responsive",
      priority: "HIGH",
    },
  }, residentCookie);

  assert(createMaint.status === 201, "Resident creates maintenance request (HTTP 201)");
  const maintReq = createMaint.data.request;
  assert(maintReq?.status === "OPEN", "New maintenance request status defaults to OPEN");
  assert(maintReq?.priority === "HIGH", "Maintenance priority set to HIGH");

  // Manager assigns Technician
  const techProfile = await req("/auth/me", {}, technicianCookie);
  const techId = techProfile.data.user?._id;

  const assignRes = await req(`/maintenance/${maintReq._id}/assign`, {
    method: "PUT",
    body: { technicianId: techId, notes: "Please inspect capacitor." },
  }, managerCookie || adminCookie);

  assert(assignRes.status === 200, "Facility Manager assigns valid Technician (HTTP 200)");
  assert(assignRes.data.request?.status === "ASSIGNED", "Status transitions to ASSIGNED");

  // Non-technician assignment rejection
  const badAssign = await req(`/maintenance/${maintReq._id}/assign`, {
    method: "PUT",
    body: { technicianId: resProfile.data.user._id },
  }, adminCookie);
  assert(badAssign.status === 400, "Assigning a non-technician user is strictly rejected (HTTP 400)");

  // Technician starts work
  const startWork = await req(`/maintenance/${maintReq._id}`, {
    method: "PUT",
    body: { status: "IN_PROGRESS" },
  }, technicianCookie);
  assert(startWork.status === 200 && startWork.data.request?.status === "IN_PROGRESS", "Technician marks ticket IN_PROGRESS");

  // Technician resolves
  const resolveWork = await req(`/maintenance/${maintReq._id}`, {
    method: "PUT",
    body: {
      status: "RESOLVED",
      resolutionNotes: "Replaced faulty capacitor and verified voltage output.",
    },
  }, technicianCookie);
  assert(resolveWork.status === 200 && resolveWork.data.request?.status === "RESOLVED", "Technician marks ticket RESOLVED with notes");
  assert(!!resolveWork.data.request?.resolvedAt, "resolvedAt timestamp recorded on resolution");

  // Resident closes ticket
  const closeWork = await req(`/maintenance/${maintReq._id}`, {
    method: "PUT",
    body: { status: "CLOSED" },
  }, residentCookie);
  assert(closeWork.status === 200 && closeWork.data.request?.status === "CLOSED", "Resident closes resolved ticket (CLOSED)");

  // -------------------------------------------------------------
  // PART 6: PHASE 10 ROLE-BASED DASHBOARDS
  // -------------------------------------------------------------
  console.log("\n[TEST GROUP 6]: Phase 10 Role-Based Dashboard APIs");

  const adminDash = await req("/dashboard/admin", {}, adminCookie);
  assert(adminDash.status === 200 && adminDash.data.overview?.totalRevenue > 0, "GET /api/dashboard/admin returns live aggregated metrics");

  const mgrDash = await req("/dashboard/manager", {}, managerCookie);
  assert(mgrDash.status === 200 && Array.isArray(mgrDash.data.buildingBreakdown), "GET /api/dashboard/manager returns scoped organization data");

  const resDash = await req("/dashboard/resident", {}, residentCookie);
  assert(resDash.status === 200 && resDash.data.hasUnit === true, "GET /api/dashboard/resident returns unit-specific metrics");

  const techDash = await req("/dashboard/technician", {}, technicianCookie);
  assert(techDash.status === 200 && techDash.data.overview?.totalAssigned >= 1, "GET /api/dashboard/technician returns assigned work order counts");

  const finDash = await req("/dashboard/finance", {}, financeCookie);
  assert(finDash.status === 200 && finDash.data.overview?.totalRevenue > 0, "GET /api/dashboard/finance returns ledger metrics");

  console.log("\n===================================================================");
  console.log(`📊 TEST SUITE SUMMARY: ${results.passed}/${results.total} TESTS PASSED`);
  if (results.failed === 0) {
    console.log("🎉 ALL PHASE 1–6 REGRESSION & PHASE 7–10 TESTS PASSED WITH 100% SUCCESS!");
  } else {
    console.error(`⚠️ ${results.failed} tests failed. Please review output above.`);
  }
  console.log("===================================================================\n");
}

runMasterTestSuite().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
