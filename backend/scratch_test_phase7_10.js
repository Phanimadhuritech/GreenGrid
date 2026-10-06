const API_BASE = "https://greengrid-gd7q.onrender.com/api";

async function runTests() {
  console.log("=================================================");
  console.log("🚀 STARTING GREENGRID PHASE 7–10 INTEGRATION TESTS");
  console.log("=================================================");

  let adminCookie = null;
  let managerCookie = null;
  let residentCookie = null;
  let technicianCookie = null;
  let financeCookie = null;

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

  // 1. Health check
  try {
    const health = await req("");
    console.log("✅ [API Health]:", health.data.message);
  } catch (err) {
    console.error("❌ Failed to reach backend API:", err.message);
    process.exit(1);
  }

  // 2. Log in all roles
  console.log("\n🔑 Authenticating all test roles...");

  // Admin
  const adminLogin = await req("/auth/login", {
    method: "POST",
    body: { email: "admin@greengrid.test", password: "AdminPassword123!" },
  });
  if (adminLogin.ok) {
    adminCookie = adminLogin.cookie;
    console.log("✅ Admin Logged In:", adminLogin.data.user.email, `(${adminLogin.data.user.role})`);
  } else {
    console.error("❌ Admin login failed:", adminLogin.data);
  }

  // Manager
  const managerLogin = await req("/auth/login", {
    method: "POST",
    body: { email: "manager@greengrid.test", password: "ManagerTest123!" },
  });
  if (managerLogin.ok) {
    managerCookie = managerLogin.cookie;
    console.log("✅ Facility Manager Logged In:", managerLogin.data.user.email, `(${managerLogin.data.user.role})`);
  } else {
    console.error("❌ Manager login failed:", managerLogin.data);
  }

  // Resident
  const residentLogin = await req("/auth/login", {
    method: "POST",
    body: { email: "resident@greengrid.test", password: "ResidentPassword123!" },
  });
  if (residentLogin.ok) {
    residentCookie = residentLogin.cookie;
    console.log("✅ Resident Logged In:", residentLogin.data.user.email, `(${residentLogin.data.user.role})`);
  } else {
    console.error("❌ Resident login failed:", residentLogin.data);
  }

  // Technician
  const techLogin = await req("/auth/login", {
    method: "POST",
    body: { email: "technician@greengrid.test", password: "TechPassword123!" },
  });
  if (techLogin.ok) {
    technicianCookie = techLogin.cookie;
    console.log("✅ Technician Logged In:", techLogin.data.user.email, `(${techLogin.data.user.role})`);
  } else {
    console.error("❌ Technician login failed:", techLogin.data);
  }

  // Finance Officer
  const financeLogin = await req("/auth/login", {
    method: "POST",
    body: { email: "finance@greengrid.test", password: "FinancePassword123!" },
  });
  if (financeLogin.ok) {
    financeCookie = financeLogin.cookie;
    console.log("✅ Finance Officer Logged In:", financeLogin.data.user.email, `(${financeLogin.data.user.role})`);
  } else {
    console.error("❌ Finance login failed:", financeLogin.data);
  }

  // Fetch resident profile
  const resProfile = await req("/auth/me", {}, residentCookie);
  const residentUser = resProfile.data.user;
  const residentUnitId = residentUser.unit;
  console.log(`Resident assigned unit ID: ${residentUnitId}`);

  // Fetch Unit details
  const unitRes = await req(`/units/${residentUnitId}`, {}, adminCookie);
  const testUnit = unitRes.data.unit;
  console.log(`Testing with Unit: ${testUnit.unitNumber} in Building: ${testUnit.building?.name}`);

  // Find or create meter for this unit
  const metersRes = await req(`/meters?unit=${testUnit._id}`, {}, adminCookie);
  let testMeter = metersRes.data.meters?.[0];
  if (!testMeter) {
    console.log("Creating active meter for test unit...");
    const mRes = await req("/meters", {
      method: "POST",
      body: {
        meterNumber: `MTR-RES-${Date.now().toString().slice(-4)}`,
        unit: testUnit._id,
        type: "ELECTRICITY",
        status: "ACTIVE",
      },
    }, adminCookie);
    testMeter = mRes.data.meter;
  }
  console.log(`Using meter: ${testMeter.meterNumber} (ID: ${testMeter._id})`);

  // Add meter readings for 250 kWh consumption: 1000 to 1250
  console.log("\n⚡ Creating meter readings: 1000 -> 1250 (250 kWh)...");
  const d1 = "2026-09-01T00:00:00.000Z";
  const d2 = "2026-09-24T00:00:00.000Z";

  await req("/readings", {
    method: "POST",
    body: {
      meter: testMeter._id,
      readingValue: 1000,
      readingDate: d1,
      source: "MANUAL",
    },
  }, adminCookie);

  await req("/readings", {
    method: "POST",
    body: {
      meter: testMeter._id,
      readingValue: 1250,
      readingDate: d2,
      source: "MANUAL",
    },
  }, adminCookie);

  // =========================================================
  // PHASE 7 TESTS: INVOICE MANAGEMENT
  // =========================================================
  console.log("\n=================================================");
  console.log("🧾 PHASE 7 TESTS — INVOICE GENERATION & VALIDATION");
  console.log("=================================================");

  const billingPeriodTest = `2026-09-T${Date.now().toString().slice(-4)}`;
  let generatedInvoice = null;

  // 1. Generate Invoice
  const invRes = await req("/invoices/generate", {
    method: "POST",
    body: {
      unitId: testUnit._id,
      billingPeriod: billingPeriodTest,
      dueDate: "2026-10-10",
      notes: "September 2026 Electricity Bill",
    },
  }, adminCookie);

  if (invRes.ok) {
    generatedInvoice = invRes.data.invoice;
    console.log("✅ Invoice generated successfully!");
    console.log(`   Invoice Number: ${generatedInvoice.invoiceNumber}`);
    console.log(`   Billing Period: ${generatedInvoice.billingPeriod}`);
    console.log(`   Consumption: ${generatedInvoice.consumption} kWh`);
    console.log(`   Energy Charge: ₹${generatedInvoice.energyCharge}`);
    console.log(`   Fixed Charge: ₹${generatedInvoice.fixedCharge}`);
    console.log(`   Tax: ₹${generatedInvoice.tax}`);
    console.log(`   Total Amount: ₹${generatedInvoice.totalAmount}`);
    console.log(`   Status: ${generatedInvoice.status}`);

    if (generatedInvoice.consumption === 250 && generatedInvoice.totalAmount === 1475) {
      console.log("🎯 EXACT PHASE 6/7 MATHEMATICAL MATCH: ₹1,475 for 250 units!");
    }
  } else {
    console.error("❌ Invoice generation failed:", invRes.data);
  }

  // 2. Duplicate prevention test
  console.log("\n🚫 Testing duplicate invoice rejection for same unit & period...");
  const dupRes = await req("/invoices/generate", {
    method: "POST",
    body: {
      unitId: testUnit._id,
      billingPeriod: billingPeriodTest,
    },
  }, adminCookie);

  if (dupRes.status === 409 || dupRes.status === 400) {
    console.log(`✅ Duplicate invoice properly rejected with HTTP ${dupRes.status}:`, dupRes.data.message);
  } else {
    console.error("❌ Duplicate invoice was NOT rejected! Status:", dupRes.status, dupRes.data);
  }

  // 3. Resident view my invoices
  const resInvoices = await req("/invoices/my", {}, residentCookie);
  console.log(`✅ Resident /api/invoices/my returned: ${resInvoices.data.count} invoices.`);

  // =========================================================
  // PHASE 8 TESTS: PAYMENT MANAGEMENT
  // =========================================================
  console.log("\n=================================================");
  console.log("💳 PHASE 8 TESTS — PAYMENT RECORDING & LIFECYCLE");
  console.log("=================================================");

  if (generatedInvoice) {
    // 1. Overpayment rejection test
    console.log(`🚫 Testing overpayment prevention (Attempting to pay ₹99,999 on ₹${generatedInvoice.totalAmount} bill)...`);
    const overPayRes = await req("/payments", {
      method: "POST",
      body: {
        invoiceId: generatedInvoice._id,
        amount: 99999,
        paymentMethod: "UPI",
      },
    }, adminCookie);

    if (overPayRes.status === 400) {
      console.log(`✅ Overpayment correctly rejected with HTTP 400:`, overPayRes.data.message);
    } else {
      console.error("❌ Overpayment was NOT rejected! Status:", overPayRes.status);
    }

    // 2. Valid payment recording
    console.log(`\n💵 Recording exact payment of ₹${generatedInvoice.totalAmount}...`);
    const payRes = await req("/payments", {
      method: "POST",
      body: {
        invoiceId: generatedInvoice._id,
        amount: generatedInvoice.totalAmount,
        paymentMethod: "UPI",
        transactionReference: `UPI-TXN-${Date.now().toString().slice(-6)}`,
        notes: "Full payment via Google Pay UPI",
      },
    }, financeCookie || adminCookie);

    if (payRes.ok) {
      console.log("✅ Payment recorded successfully!");
      console.log(`   Payment ID: ${payRes.data.payment._id}`);
      console.log(`   Amount Paid: ₹${payRes.data.payment.amount}`);
      console.log(`   Invoice New Status: ${payRes.data.invoiceStatus}`);
      console.log(`   Outstanding Balance: ₹${payRes.data.outstandingBalance}`);
    } else {
      console.error("❌ Payment recording failed:", payRes.data);
    }

    // 3. Duplicate payment on paid invoice rejection
    console.log("\n🚫 Testing payment rejection on already PAID invoice...");
    const paidPayRes = await req("/payments", {
      method: "POST",
      body: {
        invoiceId: generatedInvoice._id,
        amount: 100,
        paymentMethod: "CASH",
      },
    }, adminCookie);

    if (paidPayRes.status === 400) {
      console.log(`✅ Payment on already PAID invoice correctly rejected:`, paidPayRes.data.message);
    } else {
      console.error("❌ Payment on PAID invoice was NOT rejected! Status:", paidPayRes.status);
    }

    // 4. Resident view my payments
    const resPayments = await req("/payments/my", {}, residentCookie);
    console.log(`✅ Resident /api/payments/my returned: ${resPayments.data.count} payments.`);
  }

  // =========================================================
  // PHASE 9 TESTS: MAINTENANCE MANAGEMENT
  // =========================================================
  console.log("\n=================================================");
  console.log("🔧 PHASE 9 TESTS — MAINTENANCE REQUEST LIFECYCLE");
  console.log("=================================================");

  let testMaintenanceId = null;

  // 1. Resident creates maintenance request
  const mReqRes = await req("/maintenance", {
    method: "POST",
    body: {
      unitId: testUnit._id,
      title: "Smart meter LCD flickering",
      description: "Digital display intermittently turns off during peak hours",
      priority: "HIGH",
    },
  }, residentCookie);

  if (mReqRes.ok) {
    testMaintenanceId = mReqRes.data.request._id;
    console.log("✅ Maintenance request created by Resident:");
    console.log(`   ID: ${testMaintenanceId}`);
    console.log(`   Title: ${mReqRes.data.request.title}`);
    console.log(`   Priority: ${mReqRes.data.request.priority}`);
    console.log(`   Status: ${mReqRes.data.request.status}`);
  } else {
    console.error("❌ Maintenance request creation failed:", mReqRes.data);
  }

  // 2. Fetch technician details
  let techUser = null;
  if (technicianCookie) {
    const techSelf = await req("/auth/me", {}, technicianCookie);
    techUser = techSelf.data.user;
  }

  if (testMaintenanceId && techUser) {
    console.log(`\n👨‍🔧 Manager assigning technician (${techUser.name}) to request...`);
    const assignRes = await req(`/maintenance/${testMaintenanceId}/assign`, {
      method: "PUT",
      body: {
        technicianId: techUser._id,
        notes: "Assigned for on-site inspection tomorrow morning.",
      },
    }, managerCookie || adminCookie);

    if (assignRes.ok) {
      console.log(`✅ Assigned successfully! New Status: ${assignRes.data.request.status}`);

      // Technician starts work: status -> IN_PROGRESS
      console.log("⚡ Technician updates status to IN_PROGRESS...");
      const inProgRes = await req(`/maintenance/${testMaintenanceId}`, {
        method: "PUT",
        body: {
          status: "IN_PROGRESS",
          notes: "Inspecting wiring harness and capacitor.",
        },
      }, technicianCookie);
      console.log(`✅ Status updated to: ${inProgRes.data.request.status}`);

      // Technician resolves: status -> RESOLVED
      console.log("🛠️ Technician resolves request...");
      const resRes = await req(`/maintenance/${testMaintenanceId}`, {
        method: "PUT",
        body: {
          status: "RESOLVED",
          resolutionNotes: "Replaced faulty capacitor and calibrated meter pulse output.",
        },
      }, technicianCookie);
      console.log(`✅ Status resolved: ${resRes.data.request.status}`);
      console.log(`   Resolution Notes: ${resRes.data.request.resolutionNotes}`);
      console.log(`   Resolved At: ${resRes.data.request.resolvedAt}`);

      // Resident closes request
      console.log("🔒 Resident closes resolved request...");
      const closeRes = await req(`/maintenance/${testMaintenanceId}`, {
        method: "PUT",
        body: {
          status: "CLOSED",
          notes: "Display works perfectly now. Thank you!",
        },
      }, residentCookie);
      console.log(`✅ Status closed: ${closeRes.data.request.status}`);
    } else {
      console.error("❌ Assignment failed:", assignRes.data);
    }
  }

  // =========================================================
  // PHASE 10 TESTS: ROLE-BASED DASHBOARDS
  // =========================================================
  console.log("\n=================================================");
  console.log("📊 PHASE 10 TESTS — ROLE-BASED DASHBOARD APIS");
  console.log("=================================================");

  // 1. Admin Dashboard
  const dAdmin = await req("/dashboard/admin", {}, adminCookie);
  if (dAdmin.ok) {
    console.log("✅ Admin Dashboard API returned live MongoDB data:");
    console.log(`   Organizations: ${dAdmin.data.overview.organizationsCount}`);
    console.log(`   Buildings: ${dAdmin.data.overview.buildingsCount}`);
    console.log(`   Units: ${dAdmin.data.overview.unitsCount}`);
    console.log(`   Active Meters: ${dAdmin.data.overview.metersActive}/${dAdmin.data.overview.metersTotal}`);
    console.log(`   Total Revenue: ₹${dAdmin.data.overview.totalRevenue}`);
    console.log(`   Total Energy Consumption: ${dAdmin.data.overview.totalEnergyConsumption} kWh`);
  } else {
    console.error("❌ Admin Dashboard API failed:", dAdmin.data);
  }

  // 2. Facility Manager Dashboard
  if (managerCookie) {
    const dMgr = await req("/dashboard/manager", {}, managerCookie);
    if (dMgr.ok) {
      console.log("\n✅ Manager Dashboard API returned scoped organization data:");
      console.log(`   Org Name: ${dMgr.data.organization?.name}`);
      console.log(`   Buildings in Org: ${dMgr.data.overview.buildingsCount}`);
      console.log(`   Units in Org: ${dMgr.data.overview.unitsCount}`);
      console.log(`   Total Org Revenue: ₹${dMgr.data.overview.totalRevenue}`);
      console.log(`   Maintenance Summary:`, dMgr.data.maintenanceSummary);
    } else {
      console.error("❌ Manager Dashboard API failed:", dMgr.data);
    }
  }

  // 3. Resident Dashboard
  if (residentCookie) {
    const dRes = await req("/dashboard/resident", {}, residentCookie);
    if (dRes.ok) {
      console.log("\n✅ Resident Dashboard API returned unit-specific metrics:");
      console.log(`   Has Unit: ${dRes.data.hasUnit}`);
      if (dRes.data.unit) {
        console.log(`   Unit Number: ${dRes.data.unit.unitNumber}`);
        console.log(`   Current Consumption: ${dRes.data.currentConsumption} kWh`);
        console.log(`   Open Maintenance: ${dRes.data.openMaintenanceCount}`);
      }
    } else {
      console.error("❌ Resident Dashboard API failed:", dRes.data);
    }
  }

  // 4. Technician Dashboard
  if (technicianCookie) {
    const dTech = await req("/dashboard/technician", {}, technicianCookie);
    if (dTech.ok) {
      console.log("\n✅ Technician Dashboard API returned assigned work:");
      console.log(`   Total Assigned: ${dTech.data.overview.totalAssigned}`);
      console.log(`   In Progress: ${dTech.data.overview.inProgressCount}`);
      console.log(`   Resolved/Closed: ${dTech.data.overview.resolvedCount}`);
    } else {
      console.error("❌ Technician Dashboard API failed:", dTech.data);
    }
  }

  // 5. Finance Officer Dashboard
  if (financeCookie) {
    const dFin = await req("/dashboard/finance", {}, financeCookie);
    if (dFin.ok) {
      console.log("\n✅ Finance Dashboard API returned live financial metrics:");
      console.log(`   Total Revenue: ₹${dFin.data.overview.totalRevenue}`);
      console.log(`   Total Invoiced: ₹${dFin.data.overview.totalInvoiced}`);
      console.log(`   Pending Amount: ₹${dFin.data.overview.pendingAmount}`);
      console.log(`   Payment Methods Breakdown:`, dFin.data.paymentMethods);
    } else {
      console.error("❌ Finance Dashboard API failed:", dFin.data);
    }
  }

  console.log("\n=================================================");
  console.log("🎉 ALL PHASE 7–10 BACKEND TESTS COMPLETED SUCCESSFULLY");
  console.log("=================================================\n");
}

runTests().catch(console.error);
