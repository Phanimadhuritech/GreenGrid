import React, { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { commonStyles, theme } from "../theme";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      let endpoint = "/dashboard/admin";
      if (user.role === "FACILITY_MANAGER") endpoint = "/dashboard/manager";
      else if (user.role === "UNIT_USER") endpoint = "/dashboard/resident";
      else if (user.role === "TECHNICIAN") endpoint = "/dashboard/technician";
      else if (user.role === "FINANCE_OFFICER") endpoint = "/dashboard/finance";

      const res = await API.get(endpoint);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={commonStyles.loadingSpinner}>
          <span>🌿</span> Loading GreenGrid Dashboard...
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div
          style={{
            padding: "24px",
            backgroundColor: "#FEE2E2",
            border: "1px solid #FCA5A5",
            borderRadius: "10px",
            color: "#991B1B",
          }}
        >
          <h3 style={{ margin: "0 0 8px 0" }}>⚠️ Dashboard Error</h3>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      </AppLayout>
    );
  }

  // =========================================================================
  // 1. PLATFORM ADMIN DASHBOARD
  // =========================================================================
  if (user?.role === "PLATFORM_ADMIN") {
    const ov = data?.overview || {};
    const chartData = data?.monthlyTrends || [];

    return (
      <AppLayout>
        <div style={commonStyles.pageHeader}>
          <div style={commonStyles.titleGroup}>
            <h1 style={commonStyles.pageTitle}>System Administration Dashboard</h1>
            <p style={commonStyles.pageSubtitle}>
              Global overview of multi-tenant smart utility infrastructure and revenue operations.
            </p>
          </div>
          <div style={commonStyles.headerActions}>
            <Link to="/invoices" style={commonStyles.primaryBtn}>
              Manage Invoices
            </Link>
          </div>
        </div>

        {/* Global KPI Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          <div style={commonStyles.statCard}>
            <div style={commonStyles.statLabel}>Organizations</div>
            <div style={commonStyles.statValue}>{ov.organizationsCount ?? 0}</div>
            <div style={commonStyles.statSubtext}>{ov.buildingsCount ?? 0} Buildings total</div>
          </div>

          <div style={commonStyles.statCard}>
            <div style={commonStyles.statLabel}>Units & Meters</div>
            <div style={{ ...commonStyles.statValue, color: "#166534" }}>
              {ov.metersActive ?? 0}
              <span style={{ fontSize: "16px", color: "#64748B", fontWeight: "600" }}>
                /{ov.metersTotal ?? 0}
              </span>
            </div>
            <div style={commonStyles.statSubtext}>{ov.unitsCount ?? 0} Total Units</div>
          </div>

          <div style={commonStyles.statCard}>
            <div style={commonStyles.statLabel}>Total Energy Usage</div>
            <div style={{ ...commonStyles.statValue, color: "#16A34A" }}>
              {ov.totalEnergyConsumption ?? 0}{" "}
              <span style={{ fontSize: "14px", fontWeight: "600" }}>kWh</span>
            </div>
            <div style={commonStyles.statSubtext}>Aggregated meter telemetry</div>
          </div>

          <div style={commonStyles.statCard}>
            <div style={commonStyles.statLabel}>Total Revenue</div>
            <div style={{ ...commonStyles.statValue, color: "#0F766E" }}>
              ₹{ov.totalRevenue?.toLocaleString() ?? 0}
            </div>
            <div style={commonStyles.statSubtext}>Collected payments</div>
          </div>

          <div style={commonStyles.statCard}>
            <div style={commonStyles.statLabel}>Pending Bills</div>
            <div style={{ ...commonStyles.statValue, color: "#D97706" }}>
              ₹{ov.pendingInvoiceAmount?.toLocaleString() ?? 0}
            </div>
            <div style={commonStyles.statSubtext}>Overdue: ₹{ov.overdueInvoiceAmount ?? 0}</div>
          </div>
        </div>

        {/* Charts Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
            gap: "20px",
            marginBottom: "28px",
          }}
        >
          {/* Energy Consumption Chart */}
          <div style={commonStyles.card}>
            <div style={commonStyles.cardHeader}>
              <h3 style={commonStyles.cardTitle}>📈 Monthly Energy Consumption (kWh)</h3>
            </div>
            {chartData.length === 0 ? (
              <div style={commonStyles.emptyState}>No consumption data available yet.</div>
            ) : (
              <div style={{ height: "260px", width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16A34A" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#16A34A" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EBF1ED" />
                    <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                    <YAxis stroke="#64748B" fontSize={12} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="consumption"
                      name="Consumption (kWh)"
                      stroke="#16A34A"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#energyGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Revenue Trend Chart */}
          <div style={commonStyles.card}>
            <div style={commonStyles.cardHeader}>
              <h3 style={commonStyles.cardTitle}>💵 Revenue & Collections (₹)</h3>
            </div>
            {chartData.length === 0 ? (
              <div style={commonStyles.emptyState}>No revenue data available yet.</div>
            ) : (
              <div style={{ height: "260px", width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EBF1ED" />
                    <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                    <YAxis stroke="#64748B" fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="revenue" name="Collected (₹)" fill="#0F766E" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="invoices" name="Billed (₹)" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Recent Invoices & Maintenance Tables */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
            gap: "20px",
          }}
        >
          {/* Recent Invoices */}
          <div style={commonStyles.card}>
            <div style={commonStyles.cardHeader}>
              <h3 style={commonStyles.cardTitle}>Recent Invoices</h3>
              <Link to="/invoices" style={{ fontSize: "13px", fontWeight: "600", color: "#166534" }}>
                View All →
              </Link>
            </div>
            {data?.recentInvoices?.length === 0 ? (
              <div style={commonStyles.emptyState}>No invoices generated yet.</div>
            ) : (
              <table style={commonStyles.table}>
                <thead>
                  <tr>
                    <th style={commonStyles.th}>Invoice #</th>
                    <th style={commonStyles.th}>Unit</th>
                    <th style={commonStyles.th}>Amount</th>
                    <th style={commonStyles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recentInvoices?.map((inv) => (
                    <tr key={inv._id}>
                      <td style={commonStyles.td}>
                        <strong>{inv.invoiceNumber}</strong>
                      </td>
                      <td style={commonStyles.td}>Unit {inv.unit?.unitNumber}</td>
                      <td style={commonStyles.td}>₹{inv.totalAmount?.toLocaleString()}</td>
                      <td style={commonStyles.td}>
                        <span
                          style={
                            inv.status === "PAID"
                              ? commonStyles.badgeActive
                              : commonStyles.badgeMaintenance
                          }
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Recent Maintenance Requests */}
          <div style={commonStyles.card}>
            <div style={commonStyles.cardHeader}>
              <h3 style={commonStyles.cardTitle}>Maintenance Requests</h3>
              <Link to="/maintenance" style={{ fontSize: "13px", fontWeight: "600", color: "#166534" }}>
                View All →
              </Link>
            </div>
            {data?.recentMaintenance?.length === 0 ? (
              <div style={commonStyles.emptyState}>No maintenance requests logged.</div>
            ) : (
              <table style={commonStyles.table}>
                <thead>
                  <tr>
                    <th style={commonStyles.th}>Title</th>
                    <th style={commonStyles.th}>Unit</th>
                    <th style={commonStyles.th}>Priority</th>
                    <th style={commonStyles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recentMaintenance?.map((m) => (
                    <tr key={m._id}>
                      <td style={commonStyles.td}>
                        <strong>{m.title}</strong>
                      </td>
                      <td style={commonStyles.td}>Unit {m.unit?.unitNumber}</td>
                      <td style={commonStyles.td}>
                        <span
                          style={
                            m.priority === "URGENT"
                              ? commonStyles.badgeCritical
                              : m.priority === "HIGH"
                              ? commonStyles.badgeMaintenance
                              : commonStyles.badgeActive
                          }
                        >
                          {m.priority}
                        </span>
                      </td>
                      <td style={commonStyles.td}>
                        <span style={commonStyles.badgeNeutral}>{m.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  // =========================================================================
  // 2. FACILITY MANAGER DASHBOARD
  // =========================================================================
  if (user?.role === "FACILITY_MANAGER") {
    const org = data?.organization || {};
    const ov = data?.overview || {};
    const bBreakdown = data?.buildingBreakdown || [];

    return (
      <AppLayout>
        <div style={commonStyles.pageHeader}>
          <div style={commonStyles.titleGroup}>
            <h1 style={commonStyles.pageTitle}>Facility Management Dashboard</h1>
            <p style={commonStyles.pageSubtitle}>
              Operations overview for <strong>{org.name || "Assigned Organization"}</strong>.
            </p>
          </div>
          <div style={commonStyles.headerActions}>
            <Link to="/invoices" style={commonStyles.primaryBtn}>
              Generate Invoices
            </Link>
          </div>
        </div>

        {/* Manager KPIs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          <div style={commonStyles.statCard}>
            <div style={commonStyles.statLabel}>Buildings</div>
            <div style={commonStyles.statValue}>{ov.buildingsCount ?? 0}</div>
            <div style={commonStyles.statSubtext}>{ov.unitsCount ?? 0} Units total</div>
          </div>

          <div style={commonStyles.statCard}>
            <div style={commonStyles.statLabel}>Active Meters</div>
            <div style={{ ...commonStyles.statValue, color: "#166534" }}>
              {ov.activeMetersCount ?? 0}
              <span style={{ fontSize: "16px", color: "#64748B", fontWeight: "600" }}>
                /{ov.metersTotal ?? 0}
              </span>
            </div>
            <div style={commonStyles.statSubtext}>Online meters</div>
          </div>

          <div style={commonStyles.statCard}>
            <div style={commonStyles.statLabel}>Total Consumption</div>
            <div style={{ ...commonStyles.statValue, color: "#16A34A" }}>
              {ov.totalEnergyConsumption ?? 0}{" "}
              <span style={{ fontSize: "14px", fontWeight: "600" }}>kWh</span>
            </div>
            <div style={commonStyles.statSubtext}>Organization usage</div>
          </div>

          <div style={commonStyles.statCard}>
            <div style={commonStyles.statLabel}>Revenue Collected</div>
            <div style={{ ...commonStyles.statValue, color: "#0F766E" }}>
              ₹{ov.totalRevenue?.toLocaleString() ?? 0}
            </div>
            <div style={commonStyles.statSubtext}>Pending: ₹{ov.pendingInvoicesAmount ?? 0}</div>
          </div>
        </div>

        {/* Building Breakdown Chart */}
        <div style={{ ...commonStyles.card, marginBottom: "28px" }}>
          <div style={commonStyles.cardHeader}>
            <h3 style={commonStyles.cardTitle}>🏛️ Building Energy Consumption Breakdown</h3>
          </div>
          {bBreakdown.length === 0 ? (
            <div style={commonStyles.emptyState}>No building consumption recorded yet.</div>
          ) : (
            <div style={{ height: "260px", width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EBF1ED" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="consumption" name="Energy (kWh)" fill="#16A34A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="metersCount" name="Meters Count" fill="#0F766E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Maintenance and Recent Invoices */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
            gap: "20px",
          }}
        >
          <div style={commonStyles.card}>
            <div style={commonStyles.cardHeader}>
              <h3 style={commonStyles.cardTitle}>Recent Maintenance Tickets</h3>
              <Link to="/maintenance" style={{ fontSize: "13px", fontWeight: "600", color: "#166534" }}>
                Assign Techs →
              </Link>
            </div>
            {data?.recentMaintenance?.length === 0 ? (
              <div style={commonStyles.emptyState}>No active maintenance tickets.</div>
            ) : (
              <table style={commonStyles.table}>
                <thead>
                  <tr>
                    <th style={commonStyles.th}>Title</th>
                    <th style={commonStyles.th}>Unit</th>
                    <th style={commonStyles.th}>Tech</th>
                    <th style={commonStyles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recentMaintenance?.map((m) => (
                    <tr key={m._id}>
                      <td style={commonStyles.td}>
                        <strong>{m.title}</strong>
                      </td>
                      <td style={commonStyles.td}>Unit {m.unit?.unitNumber}</td>
                      <td style={commonStyles.td}>{m.assignedTechnician?.name || "Unassigned"}</td>
                      <td style={commonStyles.td}>
                        <span style={commonStyles.badgeMaintenance}>{m.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={commonStyles.card}>
            <div style={commonStyles.cardHeader}>
              <h3 style={commonStyles.cardTitle}>Recent Organization Invoices</h3>
              <Link to="/invoices" style={{ fontSize: "13px", fontWeight: "600", color: "#166534" }}>
                View All →
              </Link>
            </div>
            {data?.recentInvoices?.length === 0 ? (
              <div style={commonStyles.emptyState}>No invoices generated yet.</div>
            ) : (
              <table style={commonStyles.table}>
                <thead>
                  <tr>
                    <th style={commonStyles.th}>Invoice #</th>
                    <th style={commonStyles.th}>Unit</th>
                    <th style={commonStyles.th}>Amount</th>
                    <th style={commonStyles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recentInvoices?.map((inv) => (
                    <tr key={inv._id}>
                      <td style={commonStyles.td}>
                        <strong>{inv.invoiceNumber}</strong>
                      </td>
                      <td style={commonStyles.td}>Unit {inv.unit?.unitNumber}</td>
                      <td style={commonStyles.td}>₹{inv.totalAmount?.toLocaleString()}</td>
                      <td style={commonStyles.td}>
                        <span
                          style={
                            inv.status === "PAID"
                              ? commonStyles.badgeActive
                              : commonStyles.badgeMaintenance
                          }
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  // =========================================================================
  // 3. RESIDENT DASHBOARD
  // =========================================================================
  if (user?.role === "UNIT_USER") {
    const curInv = data?.currentInvoice;
    const history = data?.consumptionHistory || [];

    return (
      <AppLayout>
        <div style={commonStyles.pageHeader}>
          <div style={commonStyles.titleGroup}>
            <h1 style={commonStyles.pageTitle}>Resident Utility Dashboard</h1>
            <p style={commonStyles.pageSubtitle}>
              Live consumption monitor and billing breakdown for{" "}
              <strong>Unit {data?.unit?.unitNumber || "A-101"}</strong>.
            </p>
          </div>
          <div style={commonStyles.headerActions}>
            <Link to="/maintenance" style={commonStyles.primaryBtn}>
              + Request Maintenance
            </Link>
          </div>
        </div>

        {/* Resident Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          <div style={commonStyles.statCard}>
            <div style={commonStyles.statLabel}>My Unit Details</div>
            <div style={commonStyles.statValue}>Unit {data?.unit?.unitNumber || "N/A"}</div>
            <div style={commonStyles.statSubtext}>
              {data?.unit?.building?.name || "Tower A"} • Floor {data?.unit?.floor || 1}
            </div>
          </div>

          <div style={commonStyles.statCard}>
            <div style={commonStyles.statLabel}>Current Month Usage</div>
            <div style={{ ...commonStyles.statValue, color: "#16A34A" }}>
              {data?.currentConsumption ?? 0}{" "}
              <span style={{ fontSize: "16px", fontWeight: "600" }}>kWh</span>
            </div>
            <div style={commonStyles.statSubtext}>
              Meter: {data?.meter?.meterNumber || "Smart Meter"}
            </div>
          </div>

          <div style={commonStyles.statCard}>
            <div style={commonStyles.statLabel}>Latest Bill Amount</div>
            <div style={{ ...commonStyles.statValue, color: "#17221B" }}>
              ₹{curInv?.totalAmount?.toLocaleString() ?? 0}
            </div>
            <div style={commonStyles.statSubtext}>
              Status:{" "}
              <span
                style={{
                  fontWeight: "700",
                  color: curInv?.status === "PAID" ? "#166534" : "#D97706",
                }}
              >
                {curInv?.status || "NO INVOICE"}
              </span>
            </div>
          </div>

          <div style={commonStyles.statCard}>
            <div style={commonStyles.statLabel}>Open Service Tickets</div>
            <div style={{ ...commonStyles.statValue, color: "#0F766E" }}>
              {data?.openMaintenanceCount ?? 0}
            </div>
            <div style={commonStyles.statSubtext}>Active maintenance tickets</div>
          </div>
        </div>

        {/* Consumption History Chart */}
        <div style={{ ...commonStyles.card, marginBottom: "28px" }}>
          <div style={commonStyles.cardHeader}>
            <h3 style={commonStyles.cardTitle}>📈 6-Month Energy Consumption History</h3>
          </div>
          {history.length === 0 ? (
            <div style={commonStyles.emptyState}>No historical consumption records available.</div>
          ) : (
            <div style={{ height: "240px", width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="resGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16A34A" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#16A34A" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EBF1ED" />
                  <XAxis dataKey="billingPeriod" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="consumption"
                    name="Consumption (kWh)"
                    stroke="#16A34A"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#resGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Invoices & Payments for Resident */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
            gap: "20px",
          }}
        >
          <div style={commonStyles.card}>
            <div style={commonStyles.cardHeader}>
              <h3 style={commonStyles.cardTitle}>My Invoices</h3>
              <Link to="/invoices" style={{ fontSize: "13px", fontWeight: "600", color: "#166534" }}>
                View All →
              </Link>
            </div>
            {data?.recentInvoices?.length === 0 ? (
              <div style={commonStyles.emptyState}>No invoices generated for your unit.</div>
            ) : (
              <table style={commonStyles.table}>
                <thead>
                  <tr>
                    <th style={commonStyles.th}>Invoice #</th>
                    <th style={commonStyles.th}>Period</th>
                    <th style={commonStyles.th}>Amount</th>
                    <th style={commonStyles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recentInvoices?.map((inv) => (
                    <tr key={inv._id}>
                      <td style={commonStyles.td}>
                        <strong>{inv.invoiceNumber}</strong>
                      </td>
                      <td style={commonStyles.td}>{inv.billingPeriod}</td>
                      <td style={commonStyles.td}>₹{inv.totalAmount?.toLocaleString()}</td>
                      <td style={commonStyles.td}>
                        <span
                          style={
                            inv.status === "PAID"
                              ? commonStyles.badgeActive
                              : commonStyles.badgeMaintenance
                          }
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={commonStyles.card}>
            <div style={commonStyles.cardHeader}>
              <h3 style={commonStyles.cardTitle}>My Payments</h3>
              <Link to="/payments" style={{ fontSize: "13px", fontWeight: "600", color: "#166534" }}>
                View Receipts →
              </Link>
            </div>
            {data?.recentPayments?.length === 0 ? (
              <div style={commonStyles.emptyState}>No payment receipts recorded yet.</div>
            ) : (
              <table style={commonStyles.table}>
                <thead>
                  <tr>
                    <th style={commonStyles.th}>Receipt / Method</th>
                    <th style={commonStyles.th}>Amount</th>
                    <th style={commonStyles.th}>Date</th>
                    <th style={commonStyles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recentPayments?.map((p) => (
                    <tr key={p._id}>
                      <td style={commonStyles.td}>
                        <strong>{p.paymentMethod}</strong>
                      </td>
                      <td style={commonStyles.td}>₹{p.amount?.toLocaleString()}</td>
                      <td style={commonStyles.td}>
                        {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : "N/A"}
                      </td>
                      <td style={commonStyles.td}>
                        <span style={commonStyles.badgeActive}>✓ PAID</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  // =========================================================================
  // 4. TECHNICIAN DASHBOARD
  // =========================================================================
  if (user?.role === "TECHNICIAN") {
    const ov = data?.overview || {};

    return (
      <AppLayout>
        <div style={commonStyles.pageHeader}>
          <div style={commonStyles.titleGroup}>
            <h1 style={commonStyles.pageTitle}>Field Technician Dispatch Board</h1>
            <p style={commonStyles.pageSubtitle}>
              Active maintenance work orders, diagnostic tasks, and repair updates.
            </p>
          </div>
          <div style={commonStyles.headerActions}>
            <Link to="/maintenance" style={commonStyles.primaryBtn}>
              All Maintenance Tickets
            </Link>
          </div>
        </div>

        {/* Technician KPIs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          <div style={commonStyles.statCard}>
            <div style={commonStyles.statLabel}>Total Assigned</div>
            <div style={commonStyles.statValue}>{ov.totalAssigned ?? 0}</div>
            <div style={commonStyles.statSubtext}>Assigned tickets</div>
          </div>

          <div style={commonStyles.statCard}>
            <div style={commonStyles.statLabel}>Pending Start</div>
            <div style={{ ...commonStyles.statValue, color: "#D97706" }}>
              {ov.assignedCount ?? 0}
            </div>
            <div style={commonStyles.statSubtext}>Ready for dispatch</div>
          </div>

          <div style={commonStyles.statCard}>
            <div style={commonStyles.statLabel}>In Progress</div>
            <div style={{ ...commonStyles.statValue, color: "#2563EB" }}>
              {ov.inProgressCount ?? 0}
            </div>
            <div style={commonStyles.statSubtext}>Currently working</div>
          </div>

          <div style={commonStyles.statCard}>
            <div style={commonStyles.statLabel}>Resolved Jobs</div>
            <div style={{ ...commonStyles.statValue, color: "#166534" }}>
              {ov.resolvedCount ?? 0}
            </div>
            <div style={commonStyles.statSubtext}>Fixes completed</div>
          </div>
        </div>

        {/* Active Work Orders */}
        <div style={commonStyles.card}>
          <div style={commonStyles.cardHeader}>
            <h3 style={commonStyles.cardTitle}>🔧 Active Assigned Work Orders</h3>
          </div>
          {data?.activeTasks?.length === 0 ? (
            <div style={commonStyles.emptyState}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>✓</div>
              <p>You have no pending maintenance dispatches! Good work.</p>
            </div>
          ) : (
            <table style={commonStyles.table}>
              <thead>
                <tr>
                  <th style={commonStyles.th}>Task Title</th>
                  <th style={commonStyles.th}>Location</th>
                  <th style={commonStyles.th}>Priority</th>
                  <th style={commonStyles.th}>Status</th>
                  <th style={{ ...commonStyles.th, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data?.activeTasks?.map((task) => (
                  <tr key={task._id}>
                    <td style={commonStyles.td}>
                      <div style={{ fontWeight: "700" }}>{task.title}</div>
                      <div style={{ fontSize: "12px", color: "#64748B" }}>
                        {task.description}
                      </div>
                    </td>
                    <td style={commonStyles.td}>
                      Unit {task.unit?.unitNumber} ({task.building?.name})
                    </td>
                    <td style={commonStyles.td}>
                      <span
                        style={
                          task.priority === "URGENT"
                            ? commonStyles.badgeCritical
                            : commonStyles.badgeMaintenance
                        }
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td style={commonStyles.td}>
                      <span style={commonStyles.badgeMaintenance}>{task.status}</span>
                    </td>
                    <td style={{ ...commonStyles.td, textAlign: "right" }}>
                      <Link to="/maintenance" style={commonStyles.primaryBtn}>
                        Update Status
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </AppLayout>
    );
  }

  // =========================================================================
  // 5. FINANCE OFFICER DASHBOARD
  // =========================================================================
  if (user?.role === "FINANCE_OFFICER") {
    const ov = data?.overview || {};
    const chartData = data?.monthlyTrends || [];

    return (
      <AppLayout>
        <div style={commonStyles.pageHeader}>
          <div style={commonStyles.titleGroup}>
            <h1 style={commonStyles.pageTitle}>Financial Operations & Revenue Dashboard</h1>
            <p style={commonStyles.pageSubtitle}>
              Utility billing ledger, accounts receivable, and payment collection metrics.
            </p>
          </div>
          <div style={commonStyles.headerActions}>
            <Link to="/payments" style={commonStyles.primaryBtn}>
              + Record Payment
            </Link>
          </div>
        </div>

        {/* Finance KPIs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          <div style={commonStyles.statCard}>
            <div style={commonStyles.statLabel}>Total Invoiced</div>
            <div style={commonStyles.statValue}>₹{ov.totalInvoiced?.toLocaleString() ?? 0}</div>
            <div style={commonStyles.statSubtext}>Total billed to units</div>
          </div>

          <div style={commonStyles.statCard}>
            <div style={commonStyles.statLabel}>Total Collected</div>
            <div style={{ ...commonStyles.statValue, color: "#166534" }}>
              ₹{ov.totalRevenue?.toLocaleString() ?? 0}
            </div>
            <div style={commonStyles.statSubtext}>Cleared cash / UPI / bank</div>
          </div>

          <div style={commonStyles.statCard}>
            <div style={commonStyles.statLabel}>Pending Receivables</div>
            <div style={{ ...commonStyles.statValue, color: "#D97706" }}>
              ₹{ov.pendingAmount?.toLocaleString() ?? 0}
            </div>
            <div style={commonStyles.statSubtext}>Awaiting clearing</div>
          </div>

          <div style={commonStyles.statCard}>
            <div style={commonStyles.statLabel}>Overdue Receivables</div>
            <div style={{ ...commonStyles.statValue, color: "#991B1B" }}>
              ₹{ov.overdueAmount?.toLocaleString() ?? 0}
            </div>
            <div style={commonStyles.statSubtext}>Past due date</div>
          </div>
        </div>

        {/* Financial Trends Chart */}
        <div style={{ ...commonStyles.card, marginBottom: "28px" }}>
          <div style={commonStyles.cardHeader}>
            <h3 style={commonStyles.cardTitle}>📊 Invoiced vs Collected Revenue Trends (₹)</h3>
          </div>
          {chartData.length === 0 ? (
            <div style={commonStyles.emptyState}>No financial records logged yet.</div>
          ) : (
            <div style={{ height: "260px", width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EBF1ED" />
                  <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="invoiced" name="Invoiced (₹)" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Collected (₹)" fill="#166534" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent Payments & Pending Invoices */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
            gap: "20px",
          }}
        >
          <div style={commonStyles.card}>
            <div style={commonStyles.cardHeader}>
              <h3 style={commonStyles.cardTitle}>Recent Payment Receipts</h3>
              <Link to="/payments" style={{ fontSize: "13px", fontWeight: "600", color: "#166534" }}>
                View All →
              </Link>
            </div>
            {data?.recentPayments?.length === 0 ? (
              <div style={commonStyles.emptyState}>No payments recorded yet.</div>
            ) : (
              <table style={commonStyles.table}>
                <thead>
                  <tr>
                    <th style={commonStyles.th}>Invoice #</th>
                    <th style={commonStyles.th}>Method</th>
                    <th style={commonStyles.th}>Amount</th>
                    <th style={commonStyles.th}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recentPayments?.map((p) => (
                    <tr key={p._id}>
                      <td style={commonStyles.td}>
                        <strong>{p.invoice?.invoiceNumber}</strong>
                      </td>
                      <td style={commonStyles.td}>{p.paymentMethod}</td>
                      <td style={commonStyles.td}>₹{p.amount?.toLocaleString()}</td>
                      <td style={commonStyles.td}>
                        {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={commonStyles.card}>
            <div style={commonStyles.cardHeader}>
              <h3 style={commonStyles.cardTitle}>Pending Invoices</h3>
              <Link to="/invoices" style={{ fontSize: "13px", fontWeight: "600", color: "#166534" }}>
                Manage Invoices →
              </Link>
            </div>
            {data?.pendingInvoices?.length === 0 ? (
              <div style={commonStyles.emptyState}>All invoices cleared!</div>
            ) : (
              <table style={commonStyles.table}>
                <thead>
                  <tr>
                    <th style={commonStyles.th}>Invoice #</th>
                    <th style={commonStyles.th}>Unit</th>
                    <th style={commonStyles.th}>Due Date</th>
                    <th style={commonStyles.th}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.pendingInvoices?.map((inv) => (
                    <tr key={inv._id}>
                      <td style={commonStyles.td}>
                        <strong>{inv.invoiceNumber}</strong>
                      </td>
                      <td style={commonStyles.td}>Unit {inv.unit?.unitNumber}</td>
                      <td style={commonStyles.td}>
                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "N/A"}
                      </td>
                      <td style={commonStyles.td}>
                        <strong style={{ color: "#D97706" }}>
                          ₹{inv.totalAmount?.toLocaleString()}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Fallback
  return (
    <AppLayout>
      <div style={commonStyles.emptyState}>
        <h2>Welcome to GreenGrid</h2>
        <p>Your role dashboard is being prepared.</p>
      </div>
    </AppLayout>
  );
}