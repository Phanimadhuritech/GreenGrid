import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("consumption");

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div style={styles.pageWrapper}>
      {/* 1. PUBLIC NAVBAR */}
      <header style={styles.header}>
        <div style={styles.headerContainer}>
          <Link to="/" style={styles.brand}>
            <div style={styles.brandIcon}>
              <span>⚡</span>
            </div>
            <div style={styles.brandText}>
              <span style={styles.brandTitle}>GreenGrid</span>
              <span style={styles.brandSub}>Energy Cloud</span>
            </div>
          </Link>

          <nav style={styles.desktopNav}>
            <button onClick={() => scrollToSection("overview")} style={styles.navLink}>
              Overview
            </button>
            <button onClick={() => scrollToSection("features")} style={styles.navLink}>
              Features
            </button>
            <button onClick={() => scrollToSection("workflow")} style={styles.navLink}>
              How It Works
            </button>
            <button onClick={() => scrollToSection("roles")} style={styles.navLink}>
              Roles
            </button>
            <button onClick={() => scrollToSection("analytics")} style={styles.navLink}>
              Analytics
            </button>
            <button onClick={() => scrollToSection("security")} style={styles.navLink}>
              Security
            </button>
          </nav>

          <div style={styles.navAuth}>
            <Link to="/login" style={styles.loginBtn}>
              Sign In
            </Link>
            <Link to="/register" style={styles.getStartedBtn}>
              Get Started
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={styles.mobileMenuToggle}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div style={styles.mobileMenu}>
            <button onClick={() => scrollToSection("overview")} style={styles.mobileNavLink}>
              Overview
            </button>
            <button onClick={() => scrollToSection("features")} style={styles.mobileNavLink}>
              Features
            </button>
            <button onClick={() => scrollToSection("workflow")} style={styles.mobileNavLink}>
              How It Works
            </button>
            <button onClick={() => scrollToSection("roles")} style={styles.mobileNavLink}>
              Roles
            </button>
            <button onClick={() => scrollToSection("analytics")} style={styles.mobileNavLink}>
              Analytics
            </button>
            <button onClick={() => scrollToSection("security")} style={styles.mobileNavLink}>
              Security
            </button>
            <div style={styles.mobileAuthRow}>
              <Link to="/login" style={styles.mobileLoginBtn} onClick={() => setMobileMenuOpen(false)}>
                Sign In
              </Link>
              <Link to="/register" style={styles.mobileRegisterBtn} onClick={() => setMobileMenuOpen(false)}>
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section id="overview" style={styles.heroSection}>
        <div style={styles.heroContainer}>
          <div style={styles.heroLeft}>
            <div style={styles.badgePill}>
              <span style={styles.badgePulse}></span>
              <span>SMART ENERGY & FACILITY MANAGEMENT</span>
            </div>

            <h1 style={styles.heroHeading}>
              Manage Energy.<br />
              Manage Buildings.<br />
              <span style={styles.highlightText}>Manage Everything.</span>
            </h1>

            <p style={styles.heroSubtitle}>
              GreenGrid brings smart energy monitoring, progressive tiered utility billing,
              maintenance ticketing, and real-time facility operations into one powerful platform.
              Built for multi-tenant properties, commercial complexes, and modern residential communities.
            </p>

            <div style={styles.heroCtas}>
              <Link to="/register" style={styles.primaryCta}>
                Get Started Free ➔
              </Link>
              <button onClick={() => scrollToSection("features")} style={styles.secondaryCta}>
                Explore Features ↓
              </button>
            </div>

            <div style={styles.heroTrustBadges}>
              <div style={styles.trustItem}>
                <span style={styles.trustIcon}>🔒</span>
                <span>Role-Based Isolation</span>
              </div>
              <div style={styles.trustItem}>
                <span style={styles.trustIcon}>⚡</span>
                <span>Sub-Meter Telemetry</span>
              </div>
              <div style={styles.trustItem}>
                <span style={styles.trustIcon}>📊</span>
                <span>Deterministic Slabs</span>
              </div>
            </div>
          </div>

          <div style={styles.heroRight}>
            <div style={styles.mockupContainer}>
              <div style={styles.mockupHeader}>
                <div style={styles.mockupDots}>
                  <span style={{ ...styles.dot, backgroundColor: "#EF4444" }}></span>
                  <span style={{ ...styles.dot, backgroundColor: "#F59E0B" }}></span>
                  <span style={{ ...styles.dot, backgroundColor: "#10B981" }}></span>
                </div>
                <div style={styles.mockupAddress}>app.greengrid.io/dashboard</div>
              </div>

              {/* Mockup Dashboard Content */}
              <div style={styles.mockupBody}>
                {/* Metric Summary Bar */}
                <div style={styles.mockupKpiRow}>
                  <div style={styles.kpiBox}>
                    <span style={styles.kpiLabel}>Total Grid Load</span>
                    <span style={styles.kpiVal}>412.5 kW</span>
                    <span style={styles.kpiPositive}>▲ 2.4% vs peak</span>
                  </div>
                  <div style={styles.kpiBox}>
                    <span style={styles.kpiLabel}>Active Meters</span>
                    <span style={styles.kpiVal}>98.4%</span>
                    <span style={styles.kpiSub}>128 Online</span>
                  </div>
                  <div style={styles.kpiBox}>
                    <span style={styles.kpiLabel}>Current Period</span>
                    <span style={styles.kpiVal}>₹1,475</span>
                    <span style={styles.kpiSub}>Unit 101 Standard</span>
                  </div>
                </div>

                {/* Interactive Telemetry Card */}
                <div style={styles.mockupChartCard}>
                  <div style={styles.cardHeaderSmall}>
                    <div>
                      <h4 style={styles.cardTitleSmall}>Progressive Tiered Tariff Engine</h4>
                      <p style={styles.cardSubSmall}>Automated Progressive Calculation (250 kWh Test Benchmark)</p>
                    </div>
                    <span style={styles.badgeVerified}>✓ Verified ₹1,475</span>
                  </div>

                  <div style={styles.slabVisualGrid}>
                    <div style={styles.slabBarItem}>
                      <div style={styles.slabLabelRow}>
                        <span>Tier 1 (0–100 kWh @ ₹3)</span>
                        <span style={styles.slabCost}>₹300.00</span>
                      </div>
                      <div style={styles.slabProgressBg}>
                        <div style={{ ...styles.slabProgressFill, width: "100%", backgroundColor: "#16A34A" }}></div>
                      </div>
                    </div>
                    <div style={styles.slabBarItem}>
                      <div style={styles.slabLabelRow}>
                        <span>Tier 2 (101–200 kWh @ ₹5)</span>
                        <span style={styles.slabCost}>₹500.00</span>
                      </div>
                      <div style={styles.slabProgressBg}>
                        <div style={{ ...styles.slabProgressFill, width: "100%", backgroundColor: "#0F766E" }}></div>
                      </div>
                    </div>
                    <div style={styles.slabBarItem}>
                      <div style={styles.slabLabelRow}>
                        <span>Tier 3 (201+ kWh @ ₹7)</span>
                        <span style={styles.slabCost}>₹350.00</span>
                      </div>
                      <div style={styles.slabProgressBg}>
                        <div style={{ ...styles.slabProgressFill, width: "50%", backgroundColor: "#D97706" }}></div>
                      </div>
                    </div>
                  </div>

                  <div style={styles.calculationFooter}>
                    <div style={styles.calcCol}>
                      <span>Energy Charges: <strong>₹1,150</strong></span>
                      <span>Fixed Demand: <strong>₹100</strong></span>
                    </div>
                    <div style={styles.calcCol}>
                      <span>Tax (18% GST): <strong>₹225</strong></span>
                      <span style={{ color: "#166534", fontWeight: "700" }}>Total Invoiced: ₹1,475</span>
                    </div>
                  </div>
                </div>

                {/* Operations Snippet */}
                <div style={styles.mockupBottomRow}>
                  <div style={styles.miniOperationCard}>
                    <span style={styles.miniStatusBadge}>⚡ INVOICE #INV-2026-089</span>
                    <span style={styles.miniText}>Status: <strong>PAID</strong> • Settlement Verified</span>
                  </div>
                  <div style={styles.miniOperationCard}>
                    <span style={styles.miniStatusBadgeTech}>🛠️ DISPATCH #MNT-104</span>
                    <span style={styles.miniText}>Technician Assigned • IN_PROGRESS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TRUST & STATS STRIP */}
      <section style={styles.statsStrip}>
        <div style={styles.statsContainer}>
          <div style={styles.statStripItem}>
            <span style={styles.stripNumber}>One Platform</span>
            <span style={styles.stripDesc}>Energy telemetry + facility operations integrated seamlessly</span>
          </div>
          <div style={styles.statStripDivider}></div>
          <div style={styles.statStripItem}>
            <span style={styles.stripNumber}>5 Distinct Roles</span>
            <span style={styles.stripDesc}>Admin, Manager, Finance, Technician & Resident RBAC</span>
          </div>
          <div style={styles.statStripDivider}></div>
          <div style={styles.statStripItem}>
            <span style={styles.stripNumber}>Smart Billing</span>
            <span style={styles.stripDesc}>Deterministic tiered slab tariffs, fixed charges & taxes</span>
          </div>
          <div style={styles.statStripDivider}></div>
          <div style={styles.statStripItem}>
            <span style={styles.stripNumber}>Real-Time Insights</span>
            <span style={styles.stripDesc}>Consumption time-series, revenue ledger & CSV reporting</span>
          </div>
        </div>
      </section>

      {/* 4. PROBLEM SECTION */}
      <section style={styles.sectionLight}>
        <div style={styles.sectionContainer}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTag}>CHALLENGES WE SOLVE</span>
            <h2 style={styles.sectionTitle}>Managing Energy & Facilities Shouldn't Be Complicated</h2>
            <p style={styles.sectionSubtitle}>
              Traditional property management relies on disconnected spreadsheets, manual reading errors,
              and opaque utility splits that frustrate managers and residents alike.
            </p>
          </div>

          <div style={styles.problemGrid}>
            <div style={styles.problemCard}>
              <div style={styles.problemIcon}>📑</div>
              <h3 style={styles.problemTitle}>Scattered Energy Data</h3>
              <p style={styles.problemText}>
                Telemetry spread across spreadsheets, legacy meters, and handwritten logs prevents timely decision-making.
              </p>
            </div>

            <div style={styles.problemCard}>
              <div style={styles.problemIcon}>⏱️</div>
              <h3 style={styles.problemTitle}>Manual Reading Delays</h3>
              <p style={styles.problemText}>
                Human estimation errors and delayed meter read cycles create billing backlogs and customer disputes.
              </p>
            </div>

            <div style={styles.problemCard}>
              <div style={styles.problemIcon}>🧮</div>
              <h3 style={styles.problemTitle}>Complex Tiered Math</h3>
              <p style={styles.problemText}>
                Calculating progressive slab rates, demand charges, and statutory GST manually is error-prone.
              </p>
            </div>

            <div style={styles.problemCard}>
              <div style={styles.problemIcon}>🔧</div>
              <h3 style={styles.problemTitle}>Lost Maintenance Requests</h3>
              <p style={styles.problemText}>
                Resident repair requests get misplaced in phone logs with zero technician accountability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SOLUTION & PIPELINE WORKFLOW */}
      <section id="workflow" style={styles.sectionDark}>
        <div style={styles.sectionContainer}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTagLight}>THE GREENGRID SOLUTION</span>
            <h2 style={styles.sectionTitleLight}>One Connected Pipeline for End-to-End Operations</h2>
            <p style={styles.sectionSubtitleLight}>
              From physical meter hardware to automated financial settlement, every step of the utility lifecycle is synchronized.
            </p>
          </div>

          <div style={styles.workflowPipeline}>
            {[
              { step: "01", name: "Organizations", desc: "Multi-tenant tenant setup" },
              { step: "02", name: "Buildings & Units", desc: "Physical property hierarchy" },
              { step: "03", name: "Smart Meters", desc: "Device provisioning & binding" },
              { step: "04", name: "Meter Readings", desc: "Chronological delta telemetry" },
              { step: "05", name: "Billing Engine", desc: "Progressive slab calculation" },
              { step: "06", name: "Invoices", desc: "Unique itemized statements" },
              { step: "07", name: "Payments", desc: "Settlement & ledger tracking" },
              { step: "08", name: "Maintenance", desc: "Ticket dispatch & triage" },
              { step: "09", name: "Analytics", desc: "Visual time-series & reports" },
            ].map((item, index) => (
              <div key={index} style={styles.pipelineStep}>
                <div style={styles.pipelineBadge}>{item.step}</div>
                <h4 style={styles.pipelineName}>{item.name}</h4>
                <p style={styles.pipelineDesc}>{item.desc}</p>
                {index < 8 && <span style={styles.pipelineArrow}>➔</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CORE FEATURES */}
      <section id="features" style={styles.sectionWhite}>
        <div style={styles.sectionContainer}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTag}>CORE CAPABILITIES</span>
            <h2 style={styles.sectionTitle}>Everything You Need in One Unified Suite</h2>
            <p style={styles.sectionSubtitle}>
              Engineered from the ground up for high reliability, strict multi-tenancy, and effortless facility governance.
            </p>
          </div>

          <div style={styles.featureGrid}>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🔌</div>
              <h3 style={styles.featureTitle}>1. Smart Meter Management</h3>
              <p style={styles.featureText}>
                Register hardware meters, bind them to specific residential or commercial units, and track active/maintenance statuses.
              </p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>📈</div>
              <h3 style={styles.featureTitle}>2. Energy Telemetry & Readings</h3>
              <p style={styles.featureText}>
                Chronological meter reading logs with automated delta consumption calculation, eliminating manual subtraction errors.
              </p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>⚡</div>
              <h3 style={styles.featureTitle}>3. Progressive Slab Billing</h3>
              <p style={styles.featureText}>
                Deterministic progressive tariff engine calculating multi-tiered rate slabs (e.g. 0-100 @ ₹3, 101-200 @ ₹5, 201+ @ ₹7), fixed charges, and taxes.
              </p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🧾</div>
              <h3 style={styles.featureTitle}>4. Automated Invoicing</h3>
              <p style={styles.featureText}>
                Itemized invoice generation with unique <code>INV-</code> series tracking, billing period constraints, and duplicate prevention.
              </p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>💳</div>
              <h3 style={styles.featureTitle}>5. Payment Ledger & Settlements</h3>
              <p style={styles.featureText}>
                Record card, cash, or UPI payments against open invoices with real-time balance reduction and overpayment protection.
              </p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🛠️</div>
              <h3 style={styles.featureTitle}>6. Maintenance Request Triage</h3>
              <p style={styles.featureText}>
                Complete 5-stage ticket lifecycle: <code>OPEN</code> ➔ <code>ASSIGNED</code> ➔ <code>IN_PROGRESS</code> ➔ <code>RESOLVED</code> ➔ <code>CLOSED</code>.
              </p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>📊</div>
              <h3 style={styles.featureTitle}>7. Visual Analytics & CSV Export</h3>
              <p style={styles.featureText}>
                Interactive time-series visualizations for energy consumption, revenue collection vs arrears, and one-click real data CSV exports.
              </p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🔔</div>
              <h3 style={styles.featureTitle}>8. Notification Center & Schedulers</h3>
              <p style={styles.featureText}>
                In-app notification drawer with unread badges, automated idempotent cron billing cycles, and payment due reminder triggers.
              </p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🔒</div>
              <h3 style={styles.featureTitle}>9. Enterprise Security & Audit</h3>
              <p style={styles.featureText}>
                HTTP-only JWT cookies, 5-tier role isolation, Express rate limiters, centralized error handling, and tamper-proof audit trails.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. ROLES SECTION */}
      <section id="roles" style={styles.sectionLight}>
        <div style={styles.sectionContainer}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTag}>TAILORED ACCESS</span>
            <h2 style={styles.sectionTitle}>Built for Every Stakeholder in Your Facility</h2>
            <p style={styles.sectionSubtitle}>
              Each user persona accesses a dedicated, role-scoped workspace with strict data isolation.
            </p>
          </div>

          <div style={styles.roleGrid}>
            <div style={styles.roleCard}>
              <div style={styles.roleHeader}>
                <span style={styles.roleIcon}>👑</span>
                <div>
                  <h3 style={styles.roleTitle}>Platform Admin</h3>
                  <span style={styles.roleBadgeCode}>PLATFORM_ADMIN</span>
                </div>
              </div>
              <ul style={styles.roleList}>
                <li>Global multi-tenant governance</li>
                <li>System-wide energy load telemetry</li>
                <li>User & organization provisioning</li>
                <li>Immutable security audit logs</li>
              </ul>
            </div>

            <div style={styles.roleCard}>
              <div style={styles.roleHeader}>
                <span style={styles.roleIcon}>🏢</span>
                <div>
                  <h3 style={styles.roleTitle}>Facility Manager</h3>
                  <span style={styles.roleBadgeCode}>FACILITY_MANAGER</span>
                </div>
              </div>
              <ul style={styles.roleList}>
                <li>Scoped building & unit management</li>
                <li>Meter allocation & telemetry logs</li>
                <li>Maintenance request assignment</li>
                <li>Occupancy & consumption reports</li>
              </ul>
            </div>

            <div style={styles.roleCard}>
              <div style={styles.roleHeader}>
                <span style={styles.roleIcon}>💰</span>
                <div>
                  <h3 style={styles.roleTitle}>Finance Officer</h3>
                  <span style={styles.roleBadgeCode}>FINANCE_OFFICER</span>
                </div>
              </div>
              <ul style={styles.roleList}>
                <li>Progressive tariff configuration</li>
                <li>Scheduled billing cycle runs</li>
                <li>Invoice auditing & payment ledger</li>
                <li>Revenue collection analytics</li>
              </ul>
            </div>

            <div style={styles.roleCard}>
              <div style={styles.roleHeader}>
                <span style={styles.roleIcon}>🔧</span>
                <div>
                  <h3 style={styles.roleTitle}>Technician</h3>
                  <span style={styles.roleBadgeCode}>TECHNICIAN</span>
                </div>
              </div>
              <ul style={styles.roleList}>
                <li>Assigned dispatch queue</li>
                <li>Field status progression</li>
                <li>Resolution diagnostic notes</li>
                <li>Hardware meter inspections</li>
              </ul>
            </div>

            <div style={styles.roleCard}>
              <div style={styles.roleHeader}>
                <span style={styles.roleIcon}>🏡</span>
                <div>
                  <h3 style={styles.roleTitle}>Owner / Resident</h3>
                  <span style={styles.roleBadgeCode}>UNIT_USER</span>
                </div>
              </div>
              <ul style={styles.roleList}>
                <li>Real-time personal unit consumption</li>
                <li>Itemized invoice history</li>
                <li>Secure utility bill settlements</li>
                <li>Maintenance ticket submission</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 8. ANALYTICS & INSIGHTS PREVIEW */}
      <section id="analytics" style={styles.sectionWhite}>
        <div style={styles.sectionContainer}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTag}>INTELLIGENT INSIGHTS</span>
            <h2 style={styles.sectionTitle}>Turn Energy Data Into Actionable Intelligence</h2>
            <p style={styles.sectionSubtitle}>
              Interactive dashboards that highlight peak demand spikes, collection ratios, and cross-building comparisons.
            </p>
          </div>

          <div style={styles.analyticsShowcase}>
            <div style={styles.analyticsCard}>
              <div style={styles.analyticsNavRow}>
                <button
                  onClick={() => setActiveTab("consumption")}
                  style={{
                    ...styles.tabBtn,
                    ...(activeTab === "consumption" ? styles.tabBtnActive : {}),
                  }}
                >
                  ⚡ Consumption Telemetry
                </button>
                <button
                  onClick={() => setActiveTab("revenue")}
                  style={{
                    ...styles.tabBtn,
                    ...(activeTab === "revenue" ? styles.tabBtnActive : {}),
                  }}
                >
                  💵 Revenue & Collection
                </button>
                <button
                  onClick={() => setActiveTab("maintenance")}
                  style={{
                    ...styles.tabBtn,
                    ...(activeTab === "maintenance" ? styles.tabBtnActive : {}),
                  }}
                >
                  🛠️ Maintenance Triage
                </button>
              </div>

              {activeTab === "consumption" && (
                <div style={styles.tabContent}>
                  <div style={styles.chartHeader}>
                    <div>
                      <h4 style={styles.chartTitle}>Monthly Energy Load Distribution (kWh)</h4>
                      <p style={styles.chartSub}>Real-time aggregated telemetry across all active sub-meters</p>
                    </div>
                    <span style={styles.peakBadge}>Peak: 1,840 kWh</span>
                  </div>
                  <div style={styles.mockBarChart}>
                    {[
                      { month: "Jan", val: 65 },
                      { month: "Feb", val: 58 },
                      { month: "Mar", val: 74 },
                      { month: "Apr", val: 82 },
                      { month: "May", val: 95 },
                      { month: "Jun", val: 88 },
                      { month: "Jul", val: 92 },
                    ].map((b, i) => (
                      <div key={i} style={styles.barGroup}>
                        <div style={{ ...styles.barPillar, height: `${b.val}%` }}>
                          <span style={styles.barTooltip}>{b.val * 20} kWh</span>
                        </div>
                        <span style={styles.barLabel}>{b.month}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "revenue" && (
                <div style={styles.tabContent}>
                  <div style={styles.chartHeader}>
                    <div>
                      <h4 style={styles.chartTitle}>Invoiced vs Collected Revenue Ratio</h4>
                      <p style={styles.chartSub}>Progressive billing settlements and arrears tracking</p>
                    </div>
                    <span style={styles.peakBadgeTeal}>94.8% Settlement Rate</span>
                  </div>
                  <div style={styles.revenueProgressGrid}>
                    <div style={styles.revBox}>
                      <span style={styles.revLabel}>Total Billed</span>
                      <span style={styles.revVal}>₹1,88,800</span>
                    </div>
                    <div style={styles.revBox}>
                      <span style={styles.revLabel}>Collected</span>
                      <span style={styles.revValGreen}>₹1,78,975</span>
                    </div>
                    <div style={styles.revBox}>
                      <span style={styles.revLabel}>Pending Arrears</span>
                      <span style={styles.revValAmber}>₹9,825</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "maintenance" && (
                <div style={styles.tabContent}>
                  <div style={styles.chartHeader}>
                    <div>
                      <h4 style={styles.chartTitle}>Maintenance Resolution Velocity</h4>
                      <p style={styles.chartSub}>Real-time ticket lifecycle tracking and technician dispatch</p>
                    </div>
                    <span style={styles.peakBadge}>Avg 3.2 hrs resolution</span>
                  </div>
                  <div style={styles.ticketStatusGrid}>
                    <div style={styles.statusBoxGreen}>
                      <span style={styles.statusCount}>38</span>
                      <span style={styles.statusLabel}>Resolved / Closed</span>
                    </div>
                    <div style={styles.statusBoxAmber}>
                      <span style={styles.statusCount}>5</span>
                      <span style={styles.statusLabel}>In Progress</span>
                    </div>
                    <div style={styles.statusBoxRed}>
                      <span style={styles.statusCount}>2</span>
                      <span style={styles.statusLabel}>Open Dispatch</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 9. SECURITY & COMPLIANCE */}
      <section id="security" style={styles.sectionDarkGreen}>
        <div style={styles.sectionContainer}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTagLight}>SECURITY BY DESIGN</span>
            <h2 style={styles.sectionTitleLight}>Enterprise-Grade Isolation & Hardening</h2>
            <p style={styles.sectionSubtitleLight}>
              Protected against common web vulnerabilities, brute-force exploits, and unauthorized cross-tenant access.
            </p>
          </div>

          <div style={styles.securityGrid}>
            <div style={styles.securityCard}>
              <div style={styles.secIcon}>🍪</div>
              <h3 style={styles.secTitle}>HTTP-Only JWT Cookies</h3>
              <p style={styles.secDesc}>
                Tokens stored in secure, HTTP-only cookies prevent client-side JavaScript access and defend against XSS theft.
              </p>
            </div>

            <div style={styles.securityCard}>
              <div style={styles.secIcon}>🛡️</div>
              <h3 style={styles.secTitle}>Fine-Grained RBAC</h3>
              <p style={styles.secDesc}>
                Every controller query enforces strict tenant and unit isolation, returning 403 Forbidden on cross-tenant access.
              </p>
            </div>

            <div style={styles.securityCard}>
              <div style={styles.secIcon}>⏱️</div>
              <h3 style={styles.secTitle}>Rate Limiting Guards</h3>
              <p style={styles.secDesc}>
                Express rate limiters protect authentication endpoints from brute-force password guessing attacks.
              </p>
            </div>

            <div style={styles.securityCard}>
              <div style={styles.secIcon}>📜</div>
              <h3 style={styles.secTitle}>Immutable Audit Trail</h3>
              <p style={styles.secDesc}>
                Every administrative action, billing event, and status update is logged with actor ID and sanitized metadata.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FINAL CTA */}
      <section style={styles.ctaSection}>
        <div style={styles.ctaContainer}>
          <h2 style={styles.ctaHeading}>Ready to Manage Energy Smarter?</h2>
          <p style={styles.ctaSub}>
            Bring smart energy monitoring, deterministic billing, maintenance, and facility operations together with GreenGrid.
          </p>
          <div style={styles.ctaButtons}>
            <Link to="/register" style={styles.ctaPrimaryBtn}>
              Get Started Free ➔
            </Link>
            <Link to="/login" style={styles.ctaSecondaryBtn}>
              Sign In to Portal
            </Link>
          </div>
        </div>
      </section>

      {/* 11. FOOTER */}
      <footer style={styles.footer}>
        <div style={styles.footerContainer}>
          <div style={styles.footerBrandCol}>
            <div style={styles.brand}>
              <div style={styles.brandIcon}>
                <span>⚡</span>
              </div>
              <div style={styles.brandText}>
                <span style={styles.brandTitle}>GreenGrid</span>
                <span style={styles.brandSub}>Energy Cloud</span>
              </div>
            </div>
            <p style={styles.footerBrandText}>
              Smart energy monitoring, progressive utility billing, and full-lifecycle facility management platform.
            </p>
            <div style={styles.footerBadge}>
              <span>🔒 100% Automated Test Coverage</span>
            </div>
          </div>

          <div style={styles.footerLinksCol}>
            <h4 style={styles.footerColTitle}>Product</h4>
            <button onClick={() => scrollToSection("features")} style={styles.footerLink}>Features</button>
            <button onClick={() => scrollToSection("workflow")} style={styles.footerLink}>Workflow</button>
            <button onClick={() => scrollToSection("analytics")} style={styles.footerLink}>Analytics</button>
            <button onClick={() => scrollToSection("roles")} style={styles.footerLink}>Roles</button>
          </div>

          <div style={styles.footerLinksCol}>
            <h4 style={styles.footerColTitle}>Platform</h4>
            <button onClick={() => scrollToSection("security")} style={styles.footerLink}>Security & RBAC</button>
            <button onClick={() => scrollToSection("overview")} style={styles.footerLink}>Billing Engine</button>
            <Link to="/reports" style={styles.footerLink}>Reports Portal</Link>
            <Link to="/dashboard" style={styles.footerLink}>Live Telemetry</Link>
          </div>

          <div style={styles.footerLinksCol}>
            <h4 style={styles.footerColTitle}>Account</h4>
            <Link to="/login" style={styles.footerLink}>Sign In</Link>
            <Link to="/register" style={styles.footerLink}>Create Account</Link>
            <Link to="/forgot-password" style={styles.footerLink}>Reset Password</Link>
          </div>
        </div>

        <div style={styles.footerBottom}>
          <div style={styles.footerBottomContainer}>
            <span>© {new Date().getFullYear()} GreenGrid Platform. All rights reserved.</span>
            <span>Built with MERN Architecture & Progressive Slab Telemetry</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  pageWrapper: {
    minHeight: "100vh",
    backgroundColor: "#F4F7F5",
    color: "#17221B",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    display: "flex",
    flexDirection: "column",
    overflowX: "hidden",
  },
  header: {
    backgroundColor: "#0F3D2E",
    borderBottom: "1px solid #14532D",
    position: "sticky",
    top: 0,
    zIndex: 1000,
    boxShadow: "0 2px 10px rgba(15, 61, 46, 0.25)",
  },
  headerContainer: {
    maxWidth: "1440px",
    margin: "0 auto",
    padding: "0 28px",
    height: "70px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    textDecoration: "none",
  },
  brandIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    backgroundColor: "#16A34A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#FFFFFF",
    fontSize: "20px",
    boxShadow: "0 2px 8px rgba(22, 163, 74, 0.4)",
  },
  brandText: {
    display: "flex",
    flexDirection: "column",
  },
  brandTitle: {
    fontSize: "19px",
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: "-0.02em",
    lineHeight: "1.1",
  },
  brandSub: {
    fontSize: "10.5px",
    fontWeight: "700",
    color: "#86EFAC",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  desktopNav: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  navLink: {
    background: "transparent",
    border: "none",
    color: "#E2E8F0",
    fontSize: "14px",
    fontWeight: "500",
    padding: "8px 14px",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  navAuth: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  loginBtn: {
    color: "#FFFFFF",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "600",
    padding: "9px 16px",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    transition: "all 0.15s ease",
  },
  getStartedBtn: {
    backgroundColor: "#16A34A",
    color: "#FFFFFF",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "700",
    padding: "9px 18px",
    borderRadius: "8px",
    boxShadow: "0 2px 6px rgba(22, 163, 74, 0.35)",
    transition: "all 0.15s ease",
  },
  mobileMenuToggle: {
    display: "none",
    background: "transparent",
    border: "none",
    color: "#FFFFFF",
    fontSize: "24px",
    cursor: "pointer",
  },
  mobileMenu: {
    backgroundColor: "#0F3D2E",
    borderTop: "1px solid #14532D",
    padding: "16px 28px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  mobileNavLink: {
    background: "transparent",
    border: "none",
    color: "#E2E8F0",
    fontSize: "16px",
    fontWeight: "600",
    textAlign: "left",
    padding: "8px 0",
    cursor: "pointer",
  },
  mobileAuthRow: {
    display: "flex",
    gap: "12px",
    marginTop: "12px",
  },
  mobileLoginBtn: {
    flex: 1,
    textAlign: "center",
    color: "#FFFFFF",
    textDecoration: "none",
    fontSize: "15px",
    fontWeight: "600",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.2)",
  },
  mobileRegisterBtn: {
    flex: 1,
    textAlign: "center",
    backgroundColor: "#16A34A",
    color: "#FFFFFF",
    textDecoration: "none",
    fontSize: "15px",
    fontWeight: "700",
    padding: "10px",
    borderRadius: "8px",
  },

  // Hero Section
  heroSection: {
    backgroundColor: "#0F3D2E",
    backgroundImage: "radial-gradient(circle at 80% 20%, rgba(22, 163, 74, 0.18) 0%, rgba(15, 61, 46, 0) 60%)",
    padding: "70px 28px 90px",
    color: "#FFFFFF",
  },
  heroContainer: {
    maxWidth: "1440px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1.1fr 1fr",
    gap: "56px",
    alignItems: "center",
  },
  heroLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  badgePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "rgba(22, 163, 74, 0.2)",
    border: "1px solid rgba(134, 239, 172, 0.3)",
    color: "#86EFAC",
    fontSize: "12px",
    fontWeight: "700",
    padding: "6px 14px",
    borderRadius: "9999px",
    letterSpacing: "0.06em",
    alignSelf: "flex-start",
  },
  badgePulse: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#4ADE80",
    boxShadow: "0 0 8px #4ADE80",
  },
  heroHeading: {
    fontSize: "46px",
    fontWeight: "800",
    lineHeight: "1.12",
    letterSpacing: "-0.03em",
    color: "#FFFFFF",
    margin: 0,
  },
  highlightText: {
    color: "#4ADE80",
  },
  heroSubtitle: {
    fontSize: "16.5px",
    color: "#CBD5E1",
    lineHeight: "1.6",
    margin: 0,
    maxWidth: "580px",
  },
  heroCtas: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    marginTop: "8px",
  },
  primaryCta: {
    backgroundColor: "#16A34A",
    color: "#FFFFFF",
    textDecoration: "none",
    fontSize: "15px",
    fontWeight: "700",
    padding: "13px 26px",
    borderRadius: "10px",
    boxShadow: "0 4px 14px rgba(22, 163, 74, 0.4)",
    transition: "all 0.15s ease",
  },
  secondaryCta: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    color: "#FFFFFF",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    fontSize: "15px",
    fontWeight: "600",
    padding: "13px 24px",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  heroTrustBadges: {
    display: "flex",
    gap: "24px",
    marginTop: "16px",
    paddingTop: "20px",
    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
    flexWrap: "wrap",
  },
  trustItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "#94A3B8",
    fontWeight: "500",
  },
  trustIcon: {
    fontSize: "15px",
  },

  // Mockup Showcase
  heroRight: {
    display: "flex",
    justifyContent: "center",
  },
  mockupContainer: {
    width: "100%",
    maxWidth: "580px",
    backgroundColor: "#FFFFFF",
    borderRadius: "16px",
    border: "1px solid #DCE5DF",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
    overflow: "hidden",
  },
  mockupHeader: {
    backgroundColor: "#F8FAF9",
    borderBottom: "1px solid #DCE5DF",
    padding: "12px 18px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  mockupDots: {
    display: "flex",
    gap: "6px",
  },
  dot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
  },
  mockupAddress: {
    fontSize: "12px",
    color: "#64748B",
    backgroundColor: "#FFFFFF",
    border: "1px solid #E2E8F0",
    padding: "3px 12px",
    borderRadius: "4px",
    fontFamily: "monospace",
  },
  mockupBody: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    backgroundColor: "#F4F7F5",
  },
  mockupKpiRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "12px",
  },
  kpiBox: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #DCE5DF",
    borderRadius: "10px",
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  kpiLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
  },
  kpiVal: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#17221B",
  },
  kpiPositive: {
    fontSize: "11px",
    color: "#16A34A",
    fontWeight: "600",
  },
  kpiSub: {
    fontSize: "11px",
    color: "#0F766E",
    fontWeight: "500",
  },
  mockupChartCard: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #DCE5DF",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  cardHeaderSmall: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTitleSmall: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#17221B",
    margin: 0,
  },
  cardSubSmall: {
    fontSize: "11.5px",
    color: "#64748B",
    margin: "2px 0 0 0",
  },
  badgeVerified: {
    fontSize: "11px",
    fontWeight: "700",
    backgroundColor: "#DCFCE7",
    color: "#166534",
    padding: "3px 8px",
    borderRadius: "9999px",
  },
  slabVisualGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  slabBarItem: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  slabLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
    color: "#475569",
    fontWeight: "500",
  },
  slabCost: {
    fontWeight: "700",
    color: "#17221B",
  },
  slabProgressBg: {
    height: "6px",
    backgroundColor: "#E2E8F0",
    borderRadius: "3px",
    overflow: "hidden",
  },
  slabProgressFill: {
    height: "100%",
    borderRadius: "3px",
  },
  calculationFooter: {
    display: "flex",
    justifyContent: "space-between",
    backgroundColor: "#F8FAF9",
    border: "1px solid #E2E8F0",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "11.5px",
    color: "#334155",
  },
  calcCol: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  mockupBottomRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  miniOperationCard: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #DCE5DF",
    borderRadius: "10px",
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  miniStatusBadge: {
    fontSize: "10.5px",
    fontWeight: "700",
    color: "#166534",
    backgroundColor: "#DCFCE7",
    padding: "2px 6px",
    borderRadius: "4px",
    alignSelf: "flex-start",
  },
  miniStatusBadgeTech: {
    fontSize: "10.5px",
    fontWeight: "700",
    color: "#92400E",
    backgroundColor: "#FEF3C7",
    padding: "2px 6px",
    borderRadius: "4px",
    alignSelf: "flex-start",
  },
  miniText: {
    fontSize: "11px",
    color: "#475569",
  },

  // Stats Strip
  statsStrip: {
    backgroundColor: "#FFFFFF",
    borderBottom: "1px solid #DCE5DF",
    padding: "36px 28px",
  },
  statsContainer: {
    maxWidth: "1440px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr auto 1fr auto 1fr",
    alignItems: "center",
    gap: "24px",
  },
  statStripItem: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    textAlign: "center",
  },
  stripNumber: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#166534",
    letterSpacing: "-0.01em",
  },
  stripDesc: {
    fontSize: "13px",
    color: "#64748B",
    lineHeight: "1.4",
  },
  statStripDivider: {
    width: "1px",
    height: "40px",
    backgroundColor: "#E2E8F0",
  },

  // Section Layouts
  sectionLight: {
    backgroundColor: "#F4F7F5",
    padding: "90px 28px",
  },
  sectionWhite: {
    backgroundColor: "#FFFFFF",
    padding: "90px 28px",
  },
  sectionDark: {
    backgroundColor: "#0F3D2E",
    color: "#FFFFFF",
    padding: "90px 28px",
  },
  sectionDarkGreen: {
    backgroundColor: "#166534",
    color: "#FFFFFF",
    padding: "90px 28px",
  },
  sectionContainer: {
    maxWidth: "1440px",
    margin: "0 auto",
  },
  sectionHeader: {
    textAlign: "center",
    maxWidth: "760px",
    margin: "0 auto 56px",
  },
  sectionTag: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#166534",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    display: "inline-block",
    marginBottom: "10px",
  },
  sectionTagLight: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#86EFAC",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    display: "inline-block",
    marginBottom: "10px",
  },
  sectionTitle: {
    fontSize: "34px",
    fontWeight: "800",
    color: "#17221B",
    letterSpacing: "-0.02em",
    margin: "0 0 14px 0",
    lineHeight: "1.2",
  },
  sectionTitleLight: {
    fontSize: "34px",
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: "-0.02em",
    margin: "0 0 14px 0",
    lineHeight: "1.2",
  },
  sectionSubtitle: {
    fontSize: "16px",
    color: "#64748B",
    lineHeight: "1.5",
    margin: 0,
  },
  sectionSubtitleLight: {
    fontSize: "16px",
    color: "#CBD5E1",
    lineHeight: "1.5",
    margin: 0,
  },

  // Problem Cards
  problemGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "24px",
  },
  problemCard: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #DCE5DF",
    borderRadius: "14px",
    padding: "32px 28px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    boxShadow: "0 2px 4px rgba(15, 61, 46, 0.04)",
  },
  problemIcon: {
    fontSize: "32px",
  },
  problemTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#17221B",
    margin: 0,
  },
  problemText: {
    fontSize: "14px",
    color: "#64748B",
    lineHeight: "1.5",
    margin: 0,
  },

  // Pipeline Steps
  workflowPipeline: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: "16px",
    alignItems: "stretch",
  },
  pipelineStep: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "12px",
    padding: "20px 14px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "8px",
    position: "relative",
  },
  pipelineBadge: {
    fontSize: "12px",
    fontWeight: "800",
    backgroundColor: "#16A34A",
    color: "#FFFFFF",
    padding: "2px 8px",
    borderRadius: "6px",
  },
  pipelineName: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#FFFFFF",
    margin: 0,
  },
  pipelineDesc: {
    fontSize: "11px",
    color: "#94A3B8",
    margin: 0,
    lineHeight: "1.3",
  },
  pipelineArrow: {
    display: "none",
  },

  // Features Grid
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: "28px",
  },
  featureCard: {
    backgroundColor: "#F8FAF9",
    border: "1px solid #DCE5DF",
    borderRadius: "14px",
    padding: "32px 28px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  },
  featureIcon: {
    fontSize: "30px",
  },
  featureTitle: {
    fontSize: "17px",
    fontWeight: "700",
    color: "#17221B",
    margin: 0,
  },
  featureText: {
    fontSize: "14px",
    color: "#64748B",
    lineHeight: "1.5",
    margin: 0,
  },

  // Role Cards
  roleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "24px",
  },
  roleCard: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #DCE5DF",
    borderRadius: "14px",
    padding: "28px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    boxShadow: "0 2px 4px rgba(15, 61, 46, 0.04)",
  },
  roleHeader: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  roleIcon: {
    fontSize: "28px",
  },
  roleTitle: {
    fontSize: "17px",
    fontWeight: "700",
    color: "#17221B",
    margin: "0 0 4px 0",
  },
  roleBadgeCode: {
    fontSize: "10px",
    fontFamily: "monospace",
    fontWeight: "700",
    backgroundColor: "#DCFCE7",
    color: "#166534",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  roleList: {
    margin: 0,
    paddingLeft: "20px",
    fontSize: "13.5px",
    color: "#475569",
    lineHeight: "1.6",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  // Analytics Showcase
  analyticsShowcase: {
    maxWidth: "960px",
    margin: "0 auto",
  },
  analyticsCard: {
    backgroundColor: "#F8FAF9",
    border: "1px solid #DCE5DF",
    borderRadius: "16px",
    padding: "28px",
    boxShadow: "0 4px 12px rgba(15, 61, 46, 0.06)",
  },
  analyticsNavRow: {
    display: "flex",
    gap: "10px",
    borderBottom: "1px solid #DCE5DF",
    paddingBottom: "16px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },
  tabBtn: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #DCE5DF",
    color: "#475569",
    padding: "10px 18px",
    borderRadius: "8px",
    fontSize: "13.5px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  tabBtnActive: {
    backgroundColor: "#166534",
    color: "#FFFFFF",
    border: "1px solid #166534",
    boxShadow: "0 2px 6px rgba(22, 101, 52, 0.25)",
  },
  tabContent: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  chartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "12px",
  },
  chartTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#17221B",
    margin: 0,
  },
  chartSub: {
    fontSize: "13px",
    color: "#64748B",
    margin: "4px 0 0 0",
  },
  peakBadge: {
    fontSize: "12px",
    fontWeight: "700",
    backgroundColor: "#DCFCE7",
    color: "#166534",
    padding: "4px 10px",
    borderRadius: "9999px",
  },
  peakBadgeTeal: {
    fontSize: "12px",
    fontWeight: "700",
    backgroundColor: "#CCFBF1",
    color: "#0F766E",
    padding: "4px 10px",
    borderRadius: "9999px",
  },
  mockBarChart: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: "180px",
    padding: "20px 20px 0 20px",
    backgroundColor: "#FFFFFF",
    borderRadius: "12px",
    border: "1px solid #DCE5DF",
  },
  barGroup: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    height: "100%",
    justifyContent: "flex-end",
    flex: 1,
  },
  barPillar: {
    width: "36px",
    backgroundColor: "#16A34A",
    borderRadius: "6px 6px 0 0",
    position: "relative",
    transition: "height 0.3s ease",
  },
  barTooltip: {
    position: "absolute",
    top: "-24px",
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: "10px",
    fontWeight: "700",
    color: "#166534",
    whiteSpace: "nowrap",
  },
  barLabel: {
    fontSize: "12px",
    color: "#64748B",
    fontWeight: "600",
  },
  revenueProgressGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "16px",
  },
  revBox: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #DCE5DF",
    borderRadius: "12px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  revLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
  },
  revVal: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#17221B",
  },
  revValGreen: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#16A34A",
  },
  revValAmber: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#D97706",
  },
  ticketStatusGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "16px",
  },
  statusBoxGreen: {
    backgroundColor: "#DCFCE7",
    border: "1px solid #86EFAC",
    borderRadius: "12px",
    padding: "20px",
    textAlign: "center",
  },
  statusBoxAmber: {
    backgroundColor: "#FEF3C7",
    border: "1px solid #FCD34D",
    borderRadius: "12px",
    padding: "20px",
    textAlign: "center",
  },
  statusBoxRed: {
    backgroundColor: "#FEE2E2",
    border: "1px solid #FCA5A5",
    borderRadius: "12px",
    padding: "20px",
    textAlign: "center",
  },
  statusCount: {
    fontSize: "32px",
    fontWeight: "800",
    color: "#17221B",
    display: "block",
  },
  statusLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#475569",
  },

  // Security Grid
  securityGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "24px",
  },
  securityCard: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.16)",
    borderRadius: "14px",
    padding: "32px 26px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  secIcon: {
    fontSize: "32px",
  },
  secTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#FFFFFF",
    margin: 0,
  },
  secDesc: {
    fontSize: "14px",
    color: "#E2E8F0",
    lineHeight: "1.5",
    margin: 0,
  },

  // Final CTA
  ctaSection: {
    backgroundColor: "#0F3D2E",
    padding: "90px 28px",
    color: "#FFFFFF",
    textAlign: "center",
  },
  ctaContainer: {
    maxWidth: "800px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "20px",
  },
  ctaHeading: {
    fontSize: "38px",
    fontWeight: "800",
    letterSpacing: "-0.02em",
    margin: 0,
  },
  ctaSub: {
    fontSize: "17px",
    color: "#CBD5E1",
    lineHeight: "1.6",
    margin: 0,
    maxWidth: "600px",
  },
  ctaButtons: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: "8px",
  },
  ctaPrimaryBtn: {
    backgroundColor: "#16A34A",
    color: "#FFFFFF",
    textDecoration: "none",
    fontSize: "15px",
    fontWeight: "700",
    padding: "14px 28px",
    borderRadius: "10px",
    boxShadow: "0 4px 14px rgba(22, 163, 74, 0.4)",
    transition: "all 0.15s ease",
  },
  ctaSecondaryBtn: {
    backgroundColor: "transparent",
    color: "#FFFFFF",
    textDecoration: "none",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    fontSize: "15px",
    fontWeight: "600",
    padding: "14px 26px",
    borderRadius: "10px",
    transition: "all 0.15s ease",
  },

  // Footer
  footer: {
    backgroundColor: "#0B2B20",
    borderTop: "1px solid #14532D",
    color: "#94A3B8",
    padding: "70px 28px 0",
  },
  footerContainer: {
    maxWidth: "1440px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
    gap: "48px",
    paddingBottom: "50px",
  },
  footerBrandCol: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  footerBrandText: {
    fontSize: "13.5px",
    color: "#94A3B8",
    lineHeight: "1.5",
    margin: 0,
    maxWidth: "320px",
  },
  footerBadge: {
    fontSize: "11.5px",
    color: "#86EFAC",
    fontWeight: "600",
  },
  footerLinksCol: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  footerColTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    margin: "0 0 4px 0",
  },
  footerLink: {
    background: "transparent",
    border: "none",
    color: "#94A3B8",
    textDecoration: "none",
    fontSize: "13.5px",
    textAlign: "left",
    cursor: "pointer",
    padding: 0,
    transition: "color 0.15s ease",
  },
  footerBottom: {
    borderTop: "1px solid #14532D",
    padding: "24px 0",
  },
  footerBottomContainer: {
    maxWidth: "1440px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "12.5px",
    color: "#64748B",
    flexWrap: "wrap",
    gap: "12px",
  },
};
