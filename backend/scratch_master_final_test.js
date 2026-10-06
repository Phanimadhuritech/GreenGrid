const API_BASE = "http://localhost:5000/api";

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
  console.log("🚀 GREENGRID FINAL MASTER AUTOMATED TEST SUITE (PHASES 1–16)");
  console.log("===================================================================");

  let adminCookie = null;
  let managerCookie = null;
  let residentCookie = null;
  let technicianCookie = null;
  let financeCookie = null;

  // -------------------------------------------------------------
  // PART 1: SYSTEM HEALTH & AUTHENTICATION
  // -------------------------------------------------------------
  console.log("\n[GROUP 1]: System Health & Multi-Role Authentication");
  const health = await req("");
  assert(health.status === 200 && health.data.message?.includes("GreenGrid"), "GET /api Health Check");

  const adminLogin = await req("/auth/login", {
    method: "POST",
    body: { email: "admin@greengrid.test", password: "AdminPassword123!" },
  });
  adminCookie = adminLogin.cookie;
  assert(adminLogin.status === 200 && adminLogin.data.user?.role === "PLATFORM_ADMIN", "Admin Authentication (PLATFORM_ADMIN)");

  const managerLogin = await req("/auth/login", {
    method: "POST",
    body: { email: "manager@greengrid.test", password: "ManagerTest123!" },
  });
  managerCookie = managerLogin.cookie;
  assert(managerLogin.status === 200 && managerLogin.data.user?.role === "FACILITY_MANAGER", "Facility Manager Authentication (FACILITY_MANAGER)");

  const residentLogin = await req("/auth/login", {
    method: "POST",
    body: { email: "resident@greengrid.test", password: "ResidentPassword123!" },
  });
  residentCookie = residentLogin.cookie;
  assert(residentLogin.status === 200 && residentLogin.data.user?.role === "UNIT_USER", "Resident Authentication (UNIT_USER)");

  const techLogin = await req("/auth/login", {
    method: "POST",
    body: { email: "technician@greengrid.test", password: "TechPassword123!" },
  });
  technicianCookie = techLogin.cookie;
  assert(techLogin.status === 200 && techLogin.data.user?.role === "TECHNICIAN", "Technician Authentication (TECHNICIAN)");

  const financeLogin = await req("/auth/login", {
    method: "POST",
    body: { email: "finance@greengrid.test", password: "FinancePassword123!" },
  });
  financeCookie = financeLogin.cookie;
  assert(financeLogin.status === 200 && financeLogin.data.user?.role === "FINANCE_OFFICER", "Finance Officer Authentication (FINANCE_OFFICER)");

  // -------------------------------------------------------------
  // PART 1.5: REGISTRATION, ROLE VALIDATION & PASSWORD RESET FLOW
  // -------------------------------------------------------------
  console.log("\n[GROUP 1.5]: User Registration, Role Validation & Password Reset");

  // 1. Missing fields rejected
  const missingReg = await req("/auth/register", {
    method: "POST",
    body: { name: "", email: "", password: "" },
  });
  assert(missingReg.status === 400, "Registration missing fields rejected (HTTP 400)");

  // 2. Invalid email rejected
  const badEmailReg = await req("/auth/register", {
    method: "POST",
    body: { name: "Test", email: "not-an-email", password: "Password123!" },
  });
  assert(badEmailReg.status === 400, "Registration invalid email format rejected (HTTP 400)");

  // 3. Short password rejected
  const shortPassReg = await req("/auth/register", {
    method: "POST",
    body: { name: "Test", email: "valid@test.com", password: "123" },
  });
  assert(shortPassReg.status === 400, "Registration short password (<6 chars) rejected (HTTP 400)");

  // 4. Invalid role rejected
  const badRoleReg = await req("/auth/register", {
    method: "POST",
    body: { name: "Test", email: "role_test@test.com", password: "Password123!", role: "SUPER_GOD_MODE" },
  });
  assert(badRoleReg.status === 400, "Registration invalid role rejected (HTTP 400)");

  // 5. Valid registration
  const uniqueRegEmail = `new_resident_${Date.now()}@greengrid.test`;
  const validReg = await req("/auth/register", {
    method: "POST",
    body: {
      name: "New Resident",
      email: uniqueRegEmail,
      password: "InitialPassword123!",
      role: "UNIT_USER",
    },
  });
  assert(validReg.status === 201 && validReg.data.user?.email === uniqueRegEmail, "Valid Registration succeeds (HTTP 201)");

  // 6. Duplicate email rejected
  const dupReg = await req("/auth/register", {
    method: "POST",
    body: {
      name: "Duplicate Resident",
      email: uniqueRegEmail,
      password: "InitialPassword123!",
      role: "UNIT_USER",
    },
  });
  assert(dupReg.status === 409, "Duplicate email registration rejected (HTTP 409)");

  // 7. Forgot password request
  const forgotReq = await req("/auth/forgot-password", {
    method: "POST",
    body: { email: uniqueRegEmail },
  });
  assert(forgotReq.status === 200 && !!forgotReq.data.devResetToken, "POST /api/auth/forgot-password generates reset token");
  const rawResetToken = forgotReq.data.devResetToken;

  // 8. Reset password with invalid token
  const badReset = await req("/auth/reset-password/fake_non_existent_token_12345", {
    method: "POST",
    body: { password: "BrandNewPassword123!", confirmPassword: "BrandNewPassword123!" },
  });
  assert(badReset.status === 400, "Reset password with invalid token rejected (HTTP 400)");

  // 9. Reset password with valid token
  const goodReset = await req(`/auth/reset-password/${rawResetToken}`, {
    method: "POST",
    body: { password: "BrandNewPassword123!", confirmPassword: "BrandNewPassword123!" },
  });
  assert(goodReset.status === 200, "Reset password with valid token succeeds (HTTP 200)");

  // 10. Old password no longer works
  const oldLoginFail = await req("/auth/login", {
    method: "POST",
    body: { email: uniqueRegEmail, password: "InitialPassword123!" },
  });
  assert(oldLoginFail.status === 401, "Old password rejected after reset (HTTP 401)");

  // 11. New password succeeds
  const newLoginSuccess = await req("/auth/login", {
    method: "POST",
    body: { email: uniqueRegEmail, password: "BrandNewPassword123!" },
  });
  assert(newLoginSuccess.status === 200 && newLoginSuccess.data.user?.email === uniqueRegEmail, "New password login succeeds (HTTP 200)");

  // -------------------------------------------------------------
  // PART 2: PHASES 1–6 INFRASTRUCTURE & BILLING REGRESSION
  // -------------------------------------------------------------
  console.log("\n[GROUP 2]: Phases 1–6 Infrastructure, Readings & Billing Engine Regression");

  const unitsRes = await req("/units", {}, adminCookie);
  assert(unitsRes.status === 200 && Array.isArray(unitsRes.data.units), "GET /api/units returns list");
  const testUnit = unitsRes.data.units?.[0];
  assert(!!testUnit, "Active test unit exists");

  const metersRes = await req(`/meters?unit=${testUnit._id}`, {}, adminCookie);
  let testMeter = metersRes.data.meters?.[0];
  if (!testMeter) {
    const createMeter = await req("/meters", {
      method: "POST",
      body: {
        meterNumber: `MTR-FINAL-${Date.now().toString().slice(-4)}`,
        unit: testUnit._id,
        type: "ELECTRICITY",
        status: "ACTIVE",
      },
    }, adminCookie);
    testMeter = createMeter.data.meter;
  }
  assert(!!testMeter && testMeter.status === "ACTIVE", "Active meter assigned to unit");

  // Record readings for 250 kWh test
  const d1 = new Date("2026-07-01T00:00:00.000Z");
  const d2 = new Date("2026-07-31T00:00:00.000Z");
  await req("/readings", {
    method: "POST",
    body: { meter: testMeter._id, readingValue: 3000, readingDate: d1 },
  }, adminCookie);

  await req("/readings", {
    method: "POST",
    body: { meter: testMeter._id, readingValue: 3250, readingDate: d2 },
  }, adminCookie);

  // Progressive slab billing check (250 kWh = ₹1,475)
  console.log("  ⚡ Validating Phase 6 Progressive Slab Calculation (250 kWh = ₹1,475)...");
  const tariffs = await req("/tariffs", {}, adminCookie);
  let tariffDoc = tariffs.data.tariffs?.find((t) => t.fixedCharge === 100 && t.taxPercentage === 18 && t.status === "ACTIVE");
  if (!tariffDoc) {
    const tCreate = await req("/tariffs", {
      method: "POST",
      body: {
        name: "Standard Progressive Residential 2026 Final",
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
      startDate: "2026-07-01",
      endDate: "2026-07-31",
    },
  }, adminCookie);

  assert(calcRes.status === 200, "POST /api/billing/calculate executes successfully");
  assert(calcRes.data.consumption === 250, "Calculated consumption = 250 kWh");
  assert(calcRes.data.energyCharge === 1150, "Energy charge = ₹1,150");
  assert(calcRes.data.fixedCharge === 100, "Fixed charge = ₹100");
  assert(calcRes.data.tax === 225, "Tax = ₹225 (18% of ₹1,250)");
  assert(calcRes.data.totalAmount === 1475, "TOTAL BILL = EXACTLY ₹1,475");

  // -------------------------------------------------------------
  // PART 3: PHASE 7 INVOICE MANAGEMENT
  // -------------------------------------------------------------
  console.log("\n[GROUP 3]: Phase 7 Invoice Management");

  const billingPeriod = `2026-07-F${Date.now().toString().slice(-4)}`;
  const genInvRes = await req("/invoices/generate", {
    method: "POST",
    body: {
      unitId: testUnit._id,
      billingPeriod,
      dueDate: "2026-08-15",
      notes: "July 2026 Final Bill",
    },
  }, adminCookie);

  assert(genInvRes.status === 201, "POST /api/invoices/generate generates invoice (HTTP 201)");
  const inv = genInvRes.data.invoice;
  assert(inv?.invoiceNumber?.startsWith("INV-"), "Invoice number follows unique INV- format");
  assert(inv?.status === "PENDING", "Generated invoice status defaults to PENDING");
  assert(inv?.consumption === 250, "Invoice consumption matches 250 kWh");
  assert(inv?.totalAmount === 1475, "Invoice total matches ₹1,475");

  // Duplicate rejection
  const dupInv = await req("/invoices/generate", {
    method: "POST",
    body: { unitId: testUnit._id, billingPeriod },
  }, adminCookie);
  assert(dupInv.status === 409 || dupInv.status === 400, "Duplicate invoice for same unit & period rejected (HTTP 409/400)");

  // -------------------------------------------------------------
  // PART 4: PHASE 8 PAYMENT MANAGEMENT
  // -------------------------------------------------------------
  console.log("\n[GROUP 4]: Phase 8 Payment Management");

  // Overpayment rejection
  const overPay = await req("/payments", {
    method: "POST",
    body: { invoiceId: inv._id, amount: 99999, paymentMethod: "UPI" },
  }, adminCookie);
  assert(overPay.status === 400, "Overpayment exceeding outstanding balance rejected (HTTP 400)");

  // Valid payment
  const validPay = await req("/payments", {
    method: "POST",
    body: {
      invoiceId: inv._id,
      amount: 1475,
      paymentMethod: "UPI",
      transactionReference: `UPI-TXN-${Date.now().toString().slice(-6)}`,
      notes: "Settled via Google Pay",
    },
  }, financeCookie);

  assert(validPay.status === 201, "POST /api/payments records payment (HTTP 201)");
  assert(validPay.data.invoiceStatus === "PAID", "Invoice status transitions to PAID upon full settlement");

  // -------------------------------------------------------------
  // PART 5: PHASE 9 MAINTENANCE MANAGEMENT
  // -------------------------------------------------------------
  console.log("\n[GROUP 5]: Phase 9 Maintenance Management");

  const resProfile = await req("/auth/me", {}, residentCookie);
  const residentUnitId = resProfile.data.user?.unit?._id || resProfile.data.user?.unit || testUnit._id;

  const createMaint = await req("/maintenance", {
    method: "POST",
    body: {
      unitId: residentUnitId,
      title: "Smart meter display calibration",
      description: "Meter LCD flickers during high load periods",
      priority: "HIGH",
    },
  }, residentCookie);

  assert(createMaint.status === 201, "Resident creates maintenance request (HTTP 201)");
  const maintReq = createMaint.data.request;
  assert(maintReq?.status === "OPEN", "Maintenance request defaults to OPEN");

  const techProfile = await req("/auth/me", {}, technicianCookie);
  const techId = techProfile.data.user?._id;

  const assignRes = await req(`/maintenance/${maintReq._id}/assign`, {
    method: "PUT",
    body: { technicianId: techId, notes: "Please calibrate CT sensor." },
  }, managerCookie || adminCookie);
  assert(assignRes.status === 200 && assignRes.data.request?.status === "ASSIGNED", "Manager assigns Technician (ASSIGNED)");

  const inProgRes = await req(`/maintenance/${maintReq._id}`, {
    method: "PUT",
    body: { status: "IN_PROGRESS" },
  }, technicianCookie);
  assert(inProgRes.status === 200 && inProgRes.data.request?.status === "IN_PROGRESS", "Technician marks IN_PROGRESS");

  const resolveRes = await req(`/maintenance/${maintReq._id}`, {
    method: "PUT",
    body: {
      status: "RESOLVED",
      resolutionNotes: "Calibrated meter pulse sensor and replaced seal.",
    },
  }, technicianCookie);
  assert(resolveRes.status === 200 && resolveRes.data.request?.status === "RESOLVED", "Technician marks RESOLVED with notes");

  // -------------------------------------------------------------
  // PART 6: PHASE 10 ROLE-BASED DASHBOARDS
  // -------------------------------------------------------------
  console.log("\n[GROUP 6]: Phase 10 Role-Based Dashboard APIs");

  const adminDash = await req("/dashboard/admin", {}, adminCookie);
  assert(adminDash.status === 200 && adminDash.data.overview?.totalRevenue > 0, "GET /api/dashboard/admin returns live metrics");

  const mgrDash = await req("/dashboard/manager", {}, managerCookie);
  assert(mgrDash.status === 200 && Array.isArray(mgrDash.data.buildingBreakdown), "GET /api/dashboard/manager returns scoped org metrics");

  const resDash = await req("/dashboard/resident", {}, residentCookie);
  assert(resDash.status === 200 && resDash.data.hasUnit === true, "GET /api/dashboard/resident returns unit metrics");

  const techDash = await req("/dashboard/technician", {}, technicianCookie);
  assert(techDash.status === 200 && techDash.data.overview?.totalAssigned >= 1, "GET /api/dashboard/technician returns dispatch counts");

  const finDash = await req("/dashboard/finance", {}, financeCookie);
  assert(finDash.status === 200 && finDash.data.overview?.totalRevenue > 0, "GET /api/dashboard/finance returns ledger metrics");

  // -------------------------------------------------------------
  // PART 7: PHASE 11 ANALYTICS & REPORTS
  // -------------------------------------------------------------
  console.log("\n[GROUP 7]: Phase 11 Analytics & Reports APIs");

  const energyAnalytics = await req("/analytics/energy", {}, adminCookie);
  assert(energyAnalytics.status === 200 && Array.isArray(energyAnalytics.data.timeSeries), "GET /api/analytics/energy returns time-series data");

  const revAnalytics = await req("/analytics/revenue", {}, adminCookie);
  assert(revAnalytics.status === 200 && revAnalytics.data.summary?.totalCollected > 0, "GET /api/analytics/revenue returns revenue metrics");

  const maintAnalytics = await req("/analytics/maintenance", {}, adminCookie);
  assert(maintAnalytics.status === 200 && maintAnalytics.data.summary?.totalTickets >= 1, "GET /api/analytics/maintenance returns ticket counts");

  const bldReport = await req("/analytics/buildings", {}, adminCookie);
  assert(bldReport.status === 200 && Array.isArray(bldReport.data.buildings), "GET /api/analytics/buildings returns comparison report");

  const csvExport = await req("/analytics/export?type=energy", {}, adminCookie);
  assert(csvExport.status === 200 && typeof csvExport.data === "string" && csvExport.data.includes("Consumption_kWh"), "GET /api/analytics/export returns CSV data");

  // -------------------------------------------------------------
  // PART 8: PHASE 12 NOTIFICATIONS & SCHEDULED JOBS
  // -------------------------------------------------------------
  console.log("\n[GROUP 8]: Phase 12 Notifications & Scheduled Billing");

  const notifsRes = await req("/notifications", {}, residentCookie);
  assert(notifsRes.status === 200 && Array.isArray(notifsRes.data.notifications), "GET /api/notifications returns user notification feed");

  const unreadRes = await req("/notifications/unread", {}, residentCookie);
  assert(unreadRes.status === 200 && typeof unreadRes.data.unreadCount === "number", "GET /api/notifications/unread returns unread count");

  const markAllRes = await req("/notifications/read-all", { method: "PUT" }, residentCookie);
  assert(markAllRes.status === 200, "PUT /api/notifications/read-all marks all notifications read");

  // -------------------------------------------------------------
  // PART 9: PHASE 13 SECURITY, VALIDATION & AUDIT LOGS
  // -------------------------------------------------------------
  console.log("\n[GROUP 9]: Phase 13 Security, Validation & Audit Trail");

  // Invalid ObjectId validation check
  const badIdReq = await req("/invoices/invalid-object-id-12345", {}, adminCookie);
  assert(badIdReq.status === 400, "Invalid ObjectId properly returns HTTP 400 Bad Request");

  // Cross-role access denial check
  const techRevDenied = await req("/analytics/revenue", {}, technicianCookie);
  assert(techRevDenied.status === 403, "Technician access to revenue analytics rejected (HTTP 403)");

  // Audit Logs check (Admin-only)
  const auditRes = await req("/audit", {}, adminCookie);
  assert(auditRes.status === 200 && Array.isArray(auditRes.data.logs), "GET /api/audit returns immutable audit logs");

  const auditDenied = await req("/audit", {}, residentCookie);
  assert(auditDenied.status === 403, "Non-admin access to audit logs rejected (HTTP 403)");

  console.log("\n===================================================================");
  console.log(`📊 MASTER TEST SUITE SUMMARY: ${results.passed}/${results.total} TESTS PASSED`);
  if (results.failed === 0) {
    console.log("🎉 ALL GREENGRID PHASES 1–16 AUTOMATED TESTS PASSED WITH 100% SUCCESS!");
  } else {
    console.error(`⚠️ ${results.failed} tests failed. Review output above.`);
  }
  console.log("===================================================================\n");
}

runMasterTestSuite().catch((err) => {
  console.error("Master test execution error:", err);
  process.exit(1);
});
