const API_BASE = "https://greengrid-gd7q.onrender.com/api";

async function testProfileEndpoints() {
  console.log("==================================================");
  console.log("🧪 TESTING PROFILE ENDPOINTS & SAFE METRICS");
  console.log("==================================================");

  try {
    // 1. Log in as Facility Manager
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "manager@greengrid.test",
        password: "ManagerTest123!",
      }),
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(`Login failed: ${JSON.stringify(loginData)}`);

    const rawCookies = loginRes.headers.get("set-cookie") || "";
    const authHeaders = {
      "Content-Type": "application/json",
      Cookie: rawCookies,
      Authorization: `Bearer ${loginData.token}`,
    };

    console.log("✅ [PASS] Facility Manager authenticated");

    // 2. GET /api/auth/me
    const meRes = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders });
    const meData = await meRes.json();
    const user = meData.user;

    if (!user) throw new Error("No user object returned in /api/auth/me");
    if (user.password) throw new Error("SECURITY FAILURE: Password exposed in /api/auth/me");
    if (user.resetPasswordToken) throw new Error("SECURITY FAILURE: resetPasswordToken exposed");

    console.log("✅ [PASS] GET /api/auth/me returned sanitized profile:");
    console.log(`   - Name: ${user.name}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Phone: ${user.phone || "(none)"}`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - Status: ${user.status || "ACTIVE"}`);
    console.log(`   - Org: ${user.organization?.name || user.organization || "None"}`);
    console.log(`   - User ID: ${user._id}`);
    console.log(`   - CreatedAt: ${user.createdAt}`);

    // 3. PUT /api/auth/profile to update Name and Phone
    const updatedPhone = "+91 98765 43210";
    const updateRes = await fetch(`${API_BASE}/auth/profile`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({ name: "Rudra Manager", phone: updatedPhone }),
    });

    const updateData = await updateRes.json();
    if (!updateRes.ok) throw new Error(`Profile update failed: ${JSON.stringify(updateData)}`);

    if (updateData.user.name !== "Rudra Manager") {
      throw new Error(`Name mismatch after update: ${updateData.user.name}`);
    }
    if (updateData.user.phone !== updatedPhone) {
      throw new Error(`Phone mismatch after update: ${updateData.user.phone}`);
    }

    console.log("✅ [PASS] PUT /api/auth/profile successfully updated name & phone");

    // 4. Verify with fresh GET /api/auth/me
    const verifyRes = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders });
    const verifyData = await verifyRes.json();
    if (verifyData.user.phone !== updatedPhone) {
      throw new Error("Phone was not persisted in database");
    }

    console.log("✅ [PASS] Verified profile persistence in database");
    console.log("==================================================");
    console.log("🎉 ALL PROFILE TESTS PASSED WITH 100% SUCCESS!");
    console.log("==================================================");
  } catch (err) {
    console.error("❌ Test failed:", err.message);
    process.exit(1);
  }
}

testProfileEndpoints();
