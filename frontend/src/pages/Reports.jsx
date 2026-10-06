import React, { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { commonStyles } from "../theme";
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

const PIE_COLORS = ["#16A34A", "#D97706", "#991B1B", "#64748B"];

export default function Reports() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [buildingsReport, setBuildingsReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preset, setPreset] = useState("6m");
  const [exporting, setExporting] = useState(false);

  const canViewReports = ["PLATFORM_ADMIN", "FACILITY_MANAGER", "FINANCE_OFFICER"].includes(user?.role);

  useEffect(() => {
    if (user) {
      if (canViewReports) {
        fetchReportData();
      } else {
        setLoading(false);
      }
    }
  }, [user, preset]);

  const fetchReportData = async () => {
    setLoading(true);
    setError("");

    try {
      const now = new Date();
      let fromDate = new Date();
      if (preset === "1m") fromDate.setMonth(now.getMonth() - 1);
      else if (preset === "3m") fromDate.setMonth(now.getMonth() - 3);
      else if (preset === "6m") fromDate.setMonth(now.getMonth() - 6);
      else if (preset === "1y") fromDate.setFullYear(now.getFullYear() - 1);

      const fromStr = fromDate.toISOString().split("T")[0];
      const toStr = now.toISOString().split("T")[0];

      const [resOverview, resBuildings] = await Promise.all([
        API.get(`/analytics/overview?from=${fromStr}&to=${toStr}`),
        ["PLATFORM_ADMIN", "FACILITY_MANAGER", "FINANCE_OFFICER"].includes(user?.role)
          ? API.get("/analytics/buildings").catch(() => ({ data: { buildings: [] } }))
          : Promise.resolve({ data: { buildings: [] } }),
      ]);

      setOverview(resOverview.data);
      setBuildingsReport(resBuildings.data.buildings || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load reports data.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async (type = "energy") => {
    setExporting(true);
    try {
      const response = await API.get(`/analytics/export?type=${type}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `GreenGrid_${type}_report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to download CSV export.");
    } finally {
      setExporting(false);
    }
  };

  const statusPieData = overview?.statusDistribution
    ? [
        { name: "Paid", value: overview.statusDistribution.PAID || 0 },
        { name: "Pending", value: overview.statusDistribution.PENDING || 0 },
        { name: "Overdue", value: overview.statusDistribution.OVERDUE || 0 },
        { name: "Cancelled", value: overview.statusDistribution.CANCELLED || 0 },
      ].filter((d) => d.value > 0)
    : [];

  if (!canViewReports) {
    return (
      <AppLayout>
        <div style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #DCE5DF",
          borderRadius: "14px",
          padding: "48px 24px",
          textAlign: "center",
          maxWidth: "600px",
          margin: "40px auto",
        }}>
          <span style={{ fontSize: "40px" }}>📊</span>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#17221B", margin: "14px 0 8px" }}>
            Access Restricted
          </h2>
          <p style={{ fontSize: "14px", color: "#64748B", margin: "0 0 20px" }}>
            Operational analytics and financial reporting are restricted to Administrators, Facility Managers, and Finance Officers.
          </p>
          <a href="/dashboard" style={commonStyles.primaryBtn}>
            Return to Dashboard
          </a>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <div style={commonStyles.pageHeader}>
        <div style={commonStyles.titleGroup}>
          <h1 style={commonStyles.pageTitle}>Analytics & Operational Reports</h1>
          <p style={commonStyles.pageSubtitle}>
            Comprehensive utility consumption analytics, financial trends, and facility health reports.
          </p>
        </div>
        <div style={commonStyles.headerActions}>
          <div style={{ display: "flex", gap: "6px", backgroundColor: "#FFFFFF", padding: "4px", borderRadius: "8px", border: "1px solid #DCE5DF" }}>
            <button
              onClick={() => setPreset("1m")}
              style={{
                border: "none",
                background: preset === "1m" ? "#166534" : "transparent",
                color: preset === "1m" ? "#FFFFFF" : "#17221B",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              1 Month
            </button>
            <button
              onClick={() => setPreset("3m")}
              style={{
                border: "none",
                background: preset === "3m" ? "#166534" : "transparent",
                color: preset === "3m" ? "#FFFFFF" : "#17221B",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              3 Months
            </button>
            <button
              onClick={() => setPreset("6m")}
              style={{
                border: "none",
                background: preset === "6m" ? "#166534" : "transparent",
                color: preset === "6m" ? "#FFFFFF" : "#17221B",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              6 Months
            </button>
            <button
              onClick={() => setPreset("1y")}
              style={{
                border: "none",
                background: preset === "1y" ? "#166534" : "transparent",
                color: preset === "1y" ? "#FFFFFF" : "#17221B",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              1 Year
            </button>
          </div>

          {["PLATFORM_ADMIN", "FACILITY_MANAGER", "FINANCE_OFFICER"].includes(user?.role) && (
            <button
              onClick={() => handleExportCsv("energy")}
              disabled={exporting}
              style={commonStyles.primaryBtn}
            >
              <span>📥</span>
              <span>{exporting ? "Exporting..." : "Export Energy CSV"}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "12px 18px",
            backgroundColor: "#FEE2E2",
            border: "1px solid #FCA5A5",
            color: "#991B1B",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "14px",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={commonStyles.loadingSpinner}>
          <span>📊</span> Aggregating analytics report...
        </div>
      ) : (
        <>
          {/* Executive Summary Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              marginBottom: "28px",
            }}
          >
            <div style={commonStyles.statCard}>
              <div style={commonStyles.statLabel}>Total Energy Consumption</div>
              <div style={{ ...commonStyles.statValue, color: "#16A34A" }}>
                {overview?.energy?.totalConsumption?.toLocaleString() ?? 0}{" "}
                <span style={{ fontSize: "14px", fontWeight: "600" }}>kWh</span>
              </div>
              <div style={commonStyles.statSubtext}>
                Avg: {overview?.energy?.averageMonthlyConsumption ?? 0} kWh / month
              </div>
            </div>

            {overview?.revenue && (
              <>
                <div style={commonStyles.statCard}>
                  <div style={commonStyles.statLabel}>Total Invoiced Amount</div>
                  <div style={commonStyles.statValue}>
                    ₹{overview.revenue.totalInvoiced?.toLocaleString() ?? 0}
                  </div>
                  <div style={commonStyles.statSubtext}>All utility invoices billed</div>
                </div>

                <div style={commonStyles.statCard}>
                  <div style={commonStyles.statLabel}>Total Revenue Collected</div>
                  <div style={{ ...commonStyles.statValue, color: "#166534" }}>
                    ₹{overview.revenue.totalCollected?.toLocaleString() ?? 0}
                  </div>
                  <div style={{ ...commonStyles.statSubtext, color: "#166534" }}>
                    Collection Rate: {overview.revenue.collectionRate ?? 0}%
                  </div>
                </div>

                <div style={commonStyles.statCard}>
                  <div style={commonStyles.statLabel}>Pending / Overdue</div>
                  <div style={{ ...commonStyles.statValue, color: "#D97706" }}>
                    ₹{overview.revenue.totalPending?.toLocaleString() ?? 0}
                  </div>
                  <div style={{ ...commonStyles.statSubtext, color: "#991B1B" }}>
                    Overdue: ₹{overview.revenue.totalOverdue?.toLocaleString() ?? 0}
                  </div>
                </div>
              </>
            )}

            {overview?.maintenance && (
              <div style={commonStyles.statCard}>
                <div style={commonStyles.statLabel}>Maintenance Tickets</div>
                <div style={commonStyles.statValue}>{overview.maintenance.totalTickets ?? 0}</div>
                <div style={commonStyles.statSubtext}>
                  Avg Fix Time: {overview.maintenance.averageResolutionHours ?? 0} hrs
                </div>
              </div>
            )}
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
            {/* Energy Time-Series Chart */}
            <div style={commonStyles.card}>
              <div style={commonStyles.cardHeader}>
                <h3 style={commonStyles.cardTitle}>📈 Energy Consumption Trend (kWh)</h3>
              </div>
              {overview?.energyTimeSeries?.length === 0 ? (
                <div style={commonStyles.emptyState}>No consumption records in this period.</div>
              ) : (
                <div style={{ height: "260px", width: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overview?.energyTimeSeries}>
                      <defs>
                        <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16A34A" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#16A34A" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EBF1ED" />
                      <XAxis dataKey="period" stroke="#64748B" fontSize={12} />
                      <YAxis stroke="#64748B" fontSize={12} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="consumption"
                        name="Energy (kWh)"
                        stroke="#16A34A"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#repGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Invoiced vs Collected Bar Chart */}
            {overview?.revenueTrends?.length > 0 && (
              <div style={commonStyles.card}>
                <div style={commonStyles.cardHeader}>
                  <h3 style={commonStyles.cardTitle}>💵 Invoiced vs Collected Revenue (₹)</h3>
                </div>
                <div style={{ height: "260px", width: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview.revenueTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EBF1ED" />
                      <XAxis dataKey="period" stroke="#64748B" fontSize={12} />
                      <YAxis stroke="#64748B" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="invoiced" name="Invoiced (₹)" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="collected" name="Collected (₹)" fill="#166534" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Building Comparative Table */}
          {buildingsReport.length > 0 && (
            <div style={{ ...commonStyles.card, marginBottom: "28px" }}>
              <div style={commonStyles.cardHeader}>
                <h3 style={commonStyles.cardTitle}>🏛️ Building Comparison & Utility Utilization</h3>
                <button
                  onClick={() => handleExportCsv("buildings")}
                  style={commonStyles.outlineBtn}
                >
                  Download Building CSV
                </button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={commonStyles.table}>
                  <thead>
                    <tr>
                      <th style={commonStyles.th}>Building Name</th>
                      <th style={commonStyles.th}>Code</th>
                      <th style={commonStyles.th}>Organization</th>
                      <th style={commonStyles.th}>Units</th>
                      <th style={commonStyles.th}>Meters (Active)</th>
                      <th style={commonStyles.th}>Total Energy (kWh)</th>
                      <th style={commonStyles.th}>Total Billed (₹)</th>
                      <th style={commonStyles.th}>Open Tickets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildingsReport.map((b) => (
                      <tr key={b.buildingId} style={{ borderBottom: "1px solid #EBF1ED" }}>
                        <td style={commonStyles.td}>
                          <strong>{b.buildingName}</strong>
                        </td>
                        <td style={commonStyles.td}>{b.buildingCode}</td>
                        <td style={commonStyles.td}>{b.organizationName}</td>
                        <td style={commonStyles.td}>{b.totalUnits}</td>
                        <td style={commonStyles.td}>
                          <span style={{ color: "#166534", fontWeight: "700" }}>{b.activeMeters}</span> /{" "}
                          {b.totalMeters}
                        </td>
                        <td style={commonStyles.td}>
                          <strong style={{ color: "#16A34A" }}>
                            {b.totalConsumptionKwh?.toLocaleString()} kWh
                          </strong>
                        </td>
                        <td style={commonStyles.td}>
                          <strong>₹{b.totalBilledAmount?.toLocaleString()}</strong>
                        </td>
                        <td style={commonStyles.td}>
                          <span
                            style={
                              b.openMaintenanceTickets > 0
                                ? commonStyles.badgeMaintenance
                                : commonStyles.badgeActive
                            }
                          >
                            {b.openMaintenanceTickets} open
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
