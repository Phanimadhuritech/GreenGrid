import React, { useState, useEffect } from "react";
import API from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import AppLayout from "../../components/AppLayout";
import { commonStyles } from "../../theme";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

function ResidentConsumption() {
  const { user } = useAuth();
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [consumptionData, setConsumptionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch resident's units
  useEffect(() => {
    const fetchUserUnits = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await API.get("/units");
        const userUnits = res.data.units || [];
        setUnits(userUnits);
        if (userUnits.length > 0) {
          setSelectedUnit(userUnits[0]);
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load resident unit information");
      } finally {
        setLoading(false);
      }
    };

    fetchUserUnits();
  }, []);

  // Fetch consumption whenever selectedUnit changes
  useEffect(() => {
    if (!selectedUnit?._id) return;

    const fetchConsumption = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await API.get(`/consumption/unit/${selectedUnit._id}`);
        setConsumptionData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load consumption metrics");
        setConsumptionData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchConsumption();
  }, [selectedUnit]);

  // Aggregate monthly data for summary cards & chart
  const historyList = consumptionData?.consumption || [];
  const chartData = historyList.map((item) => ({
    date: new Date(item.readingDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    fullDate: item.readingDate,
    consumption: item.consumption || 0,
    currentReading: item.currentReading,
    previousReading: item.previousReading,
  }));

  // Calculate stats
  const totalKwh = consumptionData?.totalConsumption || historyList.reduce((acc, c) => acc + (c.consumption || 0), 0);
  const latestConsumption = historyList.length > 0 ? historyList[historyList.length - 1]?.consumption || 0 : 0;
  const latestReadingDate = historyList.length > 0 ? historyList[historyList.length - 1]?.readingDate : null;

  return (
    <AppLayout>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Page Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ ...commonStyles.badge, ...commonStyles.badgeTeal }}>Resident Portal</span>
              <span style={{ fontSize: "12px", color: "#16A34A", fontWeight: "600" }}>● Real-Time Telemetry</span>
            </div>
            <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#17221B", margin: 0, letterSpacing: "-0.02em" }}>
              My Energy Consumption
            </h1>
            <p style={{ fontSize: "14px", color: "#64748B", margin: "4px 0 0 0" }}>
              Track electricity usage, analyze historical consumption curves, and review telemetry data.
            </p>
          </div>

          {units.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>Select Unit:</label>
              <select
                value={selectedUnit?._id || ""}
                onChange={(e) => {
                  const found = units.find((u) => u._id === e.target.value);
                  setSelectedUnit(found);
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid #DCE5DF",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#17221B",
                  background: "#FFFFFF",
                  cursor: "pointer",
                  outline: "none"
                }}
                id="resident-unit-select"
              >
                {units.map((u) => (
                  <option key={u._id} value={u._id}>
                    Unit {u.unitNumber} - {u.building?.name || "Building"}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && (
          <div style={{
            background: "#FEF2F2",
            border: "1px solid #F87171",
            color: "#991B1B",
            padding: "14px 18px",
            borderRadius: "10px",
            marginBottom: "20px",
            fontSize: "14px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Selected Unit & Meter Banner */}
        {selectedUnit && (
          <div style={{
            background: "#FFFFFF",
            border: "1px solid #DCE5DF",
            borderRadius: "14px",
            padding: "18px 24px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "#E8F5E9",
                border: "1px solid #C8E6C9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                color: "#166534"
              }}>⚡</div>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#17221B", margin: "0 0 2px 0" }}>
                  Unit {selectedUnit.unitNumber} &bull; {selectedUnit.building?.name || "Building"}
                </h3>
                <p style={{ fontSize: "13px", color: "#64748B", margin: 0 }}>
                  {selectedUnit.building?.organization?.name || "GreenGrid Facility"} &bull; Floor {selectedUnit.floor} &bull; {selectedUnit.type}
                </p>
              </div>
            </div>

            {consumptionData?.meter && (
              <div style={{
                background: "#F8FAFC",
                border: "1px solid #CBD5E1",
                padding: "6px 14px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span style={{ fontSize: "12px", color: "#64748B", fontWeight: "500" }}>Active Meter:</span>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#0F172A", fontFamily: "monospace" }}>
                  {consumptionData.meter.meterNumber}
                </span>
                <span style={{ ...commonStyles.badge, ...commonStyles.badgeActive, marginLeft: "6px" }}>ACTIVE</span>
              </div>
            )}
          </div>
        )}

        {/* KPI Row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "18px",
          marginBottom: "24px"
        }}>
          <div style={{
            background: "#FFFFFF",
            border: "1px solid #DCE5DF",
            borderRadius: "12px",
            padding: "20px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
          }}>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
              Total Energy Consumed
            </div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "#166534", letterSpacing: "-0.02em" }}>
              {loading ? "..." : `${totalKwh.toLocaleString()} kWh`}
            </div>
            <div style={{ fontSize: "12.5px", color: "#94A3B8", marginTop: "4px" }}>
              Cumulative verified consumption
            </div>
          </div>

          <div style={{
            background: "#FFFFFF",
            border: "1px solid #DCE5DF",
            borderRadius: "12px",
            padding: "20px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
          }}>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
              Latest Cycle Usage
            </div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "#0F766E", letterSpacing: "-0.02em" }}>
              {loading ? "..." : `${latestConsumption.toLocaleString()} kWh`}
            </div>
            <div style={{ fontSize: "12.5px", color: "#94A3B8", marginTop: "4px" }}>
              {latestReadingDate
                ? `Logged on ${new Date(latestReadingDate).toLocaleDateString()}`
                : "Awaiting next cycle"}
            </div>
          </div>

          <div style={{
            background: "#FFFFFF",
            border: "1px solid #DCE5DF",
            borderRadius: "12px",
            padding: "20px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
          }}>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
              Telemetry Data Points
            </div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "#1E293B", letterSpacing: "-0.02em" }}>
              {loading ? "..." : historyList.length}
            </div>
            <div style={{ fontSize: "12.5px", color: "#94A3B8", marginTop: "4px" }}>
              Chronological meter readings
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748B", background: "#FFFFFF", borderRadius: "12px", border: "1px solid #DCE5DF" }}>
            Loading consumption telemetry...
          </div>
        ) : historyList.length === 0 ? (
          <div style={{
            padding: "60px 20px",
            textAlign: "center",
            background: "#FFFFFF",
            borderRadius: "14px",
            border: "1px solid #DCE5DF"
          }}>
            <span style={{ fontSize: "36px" }}>⚡</span>
            <p style={{ fontWeight: "700", fontSize: "16px", color: "#17221B", margin: "12px 0 4px 0" }}>
              No consumption recorded yet for this unit.
            </p>
            <p style={{ margin: 0, fontSize: "14px", color: "#64748B" }}>
              Meter readings logged by facility managers will automatically calculate and appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Recharts Consumption Bar Chart */}
            <div style={{
              background: "#FFFFFF",
              border: "1px solid #DCE5DF",
              borderRadius: "14px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#17221B", margin: 0 }}>
                    Consumption Timeline (kWh)
                  </h3>
                  <p style={{ fontSize: "13px", color: "#64748B", margin: "2px 0 0 0" }}>
                    Verified kWh by reading date
                  </p>
                </div>
                <span style={{ ...commonStyles.badge, ...commonStyles.badgeNeutral }}>Telemetry Chart</span>
              </div>
              <div style={{ width: "100%", height: "300px", marginTop: "20px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" stroke="#64748B" fontSize={12} />
                    <YAxis stroke="#64748B" fontSize={12} unit=" kWh" />
                    <Tooltip
                      formatter={(value) => [`${value.toLocaleString()} kWh`, "Consumption"]}
                      labelFormatter={(label, payload) => {
                        const item = payload?.[0]?.payload;
                        return item ? `Date: ${new Date(item.fullDate).toLocaleDateString()}` : label;
                      }}
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #DCE5DF",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="consumption" name="Energy Consumed (kWh)" fill="#166534" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Consumption History Table */}
            <div style={{
              background: "#FFFFFF",
              border: "1px solid #DCE5DF",
              borderRadius: "14px",
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
            }}>
              <div style={{ padding: "18px 24px", borderBottom: "1px solid #EDF2EF" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#17221B", margin: 0 }}>
                  Detailed Consumption Breakdown
                </h3>
                <p style={{ fontSize: "13px", color: "#64748B", margin: "2px 0 0 0" }}>
                  Delta calculation: (Current Reading - Previous Reading)
                </p>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #EDF2EF" }}>
                      <th style={{ padding: "14px 24px", fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Reading Date</th>
                      <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Previous Reading</th>
                      <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Current Reading</th>
                      <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Consumption</th>
                      <th style={{ padding: "14px 24px", fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "16px 24px", fontWeight: "600", color: "#17221B" }}>
                          {new Date(item.readingDate).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td style={{ padding: "16px 20px", color: "#64748B", fontFamily: "monospace" }}>
                          {item.previousReading !== null && item.previousReading !== undefined
                            ? `${item.previousReading.toLocaleString()} kWh`
                            : "— (Baseline)"}
                        </td>
                        <td style={{ padding: "16px 20px", fontWeight: "700", color: "#17221B", fontFamily: "monospace" }}>
                          {item.currentReading.toLocaleString()} kWh
                        </td>
                        <td style={{ padding: "16px 20px", fontWeight: "700" }}>
                          {item.previousReading !== null && item.previousReading !== undefined ? (
                            <span style={{
                              ...commonStyles.badge,
                              ...(item.consumption > 0 ? commonStyles.badgeActive : commonStyles.badgeNeutral),
                              fontWeight: "700",
                            }}>
                              +{item.consumption.toLocaleString()} kWh
                            </span>
                          ) : (
                            <span style={{ ...commonStyles.badge, ...commonStyles.badgeNeutral }}>
                              Baseline Reading
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "16px 24px" }}>
                          <span style={{ ...commonStyles.badge, ...commonStyles.badgeTeal }}>
                            VERIFIED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default ResidentConsumption;
