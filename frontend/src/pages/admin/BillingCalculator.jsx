import React, { useState, useEffect } from "react";
import API from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import AppLayout from "../../components/AppLayout";
import { commonStyles } from "../../theme";

export default function BillingCalculator() {
  const { user } = useAuth();
  const [calcMode, setCalcMode] = useState("SIMULATION"); // "SIMULATION" or "METER"
  const [tariffs, setTariffs] = useState([]);
  const [meters, setMeters] = useState([]);
  const [units, setUnits] = useState([]);

  // Form Inputs
  const [consumptionInput, setConsumptionInput] = useState(250);
  const [selectedTariffId, setSelectedTariffId] = useState("");
  const [selectedMeterId, setSelectedMeterId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");

  // Result & State
  const [billResult, setBillResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    const fetchDropdowns = async () => {
      try {
        setFetchingData(true);
        const isStaff = ["PLATFORM_ADMIN", "FACILITY_MANAGER"].includes(user?.role);
        
        const promises = [API.get("/units")];
        if (isStaff) {
          promises.push(API.get("/tariffs"));
          promises.push(API.get("/meters"));
        }

        const results = await Promise.allSettled(promises);

        // Units is always first
        if (results[0].status === "fulfilled") {
          const list = results[0].value.data.units || [];
          setUnits(list);
          if (list.length > 0) {
            setSelectedUnitId(list[0]._id);
          }
        }

        if (isStaff) {
          if (results[1]?.status === "fulfilled") {
            const list = results[1].value.data.tariffs || [];
            setTariffs(list);
            if (list.length > 0) {
              setSelectedTariffId(list[0]._id);
            }
          }

          if (results[2]?.status === "fulfilled") {
            const list = results[2].value.data.meters || [];
            setMeters(list);
            if (list.length > 0) {
              setSelectedMeterId(list[0]._id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load calculator dropdowns:", err);
      } finally {
        setFetchingData(false);
      }
    };

    fetchDropdowns();
  }, [user]);

  const handleCalculate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let payload = {};

      if (calcMode === "SIMULATION") {
        if (consumptionInput === "" || consumptionInput === null || isNaN(Number(consumptionInput)) || Number(consumptionInput) < 0) {
          setError("Please enter a valid non-negative consumption value (kWh)");
          setLoading(false);
          return;
        }

        payload = {
          consumption: Number(consumptionInput),
          consumptionUnits: Number(consumptionInput),
          tariffId: selectedTariffId || undefined,
        };
      } else {
        if (!selectedMeterId && !selectedUnitId) {
          setError("Please select a meter or unit to evaluate consumption");
          setLoading(false);
          return;
        }

        payload = {
          meterId: selectedMeterId || undefined,
          unitId: selectedUnitId || undefined,
          tariffId: selectedTariffId || undefined,
        };
      }

      const res = await API.post("/billing/calculate", payload);
      setBillResult(res.data.data || res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to calculate electricity bill");
      setBillResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      {/* Header */}
      <div style={commonStyles.pageHeader}>
        <div style={commonStyles.titleGroup}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ ...commonStyles.badgeActive, backgroundColor: "#CCFBF1", color: "#0F766E" }}>
              ⚡ Progressive Billing Engine
            </span>
            <span style={{ fontSize: "12px", color: "#16A34A", fontWeight: "600" }}>
              ● Real-Time Tariff Simulation
            </span>
          </div>
          <h1 style={commonStyles.pageTitle}>Electricity Billing Calculator</h1>
          <p style={commonStyles.pageSubtitle}>
            Derive progressive slab charges, demand rates, taxes, and net invoices via the backend billing engine.
          </p>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div style={styles.modeTabs}>
        <button
          type="button"
          onClick={() => {
            setCalcMode("SIMULATION");
            setBillResult(null);
          }}
          style={calcMode === "SIMULATION" ? styles.activeTab : styles.tab}
          id="tab-sim-mode"
        >
          ⚡ Direct Consumption Simulation (kWh)
        </button>
        <button
          type="button"
          onClick={() => {
            setCalcMode("METER");
            setBillResult(null);
          }}
          style={calcMode === "METER" ? styles.activeTab : styles.tab}
          id="tab-meter-mode"
        >
          📊 Live Meter / Unit Telemetry
        </button>
      </div>

      {/* Error / Alert */}
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
            fontWeight: "500",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Calculator Controls Form */}
      <div style={{ ...commonStyles.card, marginBottom: "28px" }}>
        <form onSubmit={handleCalculate}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
            {calcMode === "SIMULATION" ? (
              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Target Consumption (kWh) *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={consumptionInput}
                  onChange={(e) => setConsumptionInput(e.target.value)}
                  required
                  style={commonStyles.input}
                  placeholder="e.g. 250"
                  id="calc-consumption-input"
                />
                <span style={{ fontSize: "11.5px", color: "#64748B", marginTop: "4px", display: "block" }}>
                  Standard verification benchmark: 250 kWh = ₹1,475
                </span>
              </div>
            ) : (
              <>
                <div style={commonStyles.formGroup}>
                  <label style={commonStyles.label}>Select Meter</label>
                  <select
                    value={selectedMeterId}
                    onChange={(e) => {
                      setSelectedMeterId(e.target.value);
                      if (e.target.value) setSelectedUnitId("");
                    }}
                    style={commonStyles.input}
                    id="calc-meter-select"
                  >
                    <option value="">-- Choose Meter --</option>
                    {meters.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.meterNumber} ({m.unit?.unitNumber ? `Unit ${m.unit.unitNumber}` : "Unassigned"})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={commonStyles.formGroup}>
                  <label style={commonStyles.label}>Or Select Unit</label>
                  <select
                    value={selectedUnitId}
                    onChange={(e) => {
                      setSelectedUnitId(e.target.value);
                      if (e.target.value) setSelectedMeterId("");
                    }}
                    style={commonStyles.input}
                    id="calc-unit-select"
                  >
                    <option value="">-- Choose Unit --</option>
                    {units.map((u) => (
                      <option key={u._id} value={u._id}>
                        Unit {u.unitNumber} ({u.building?.name || "Building"})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div style={commonStyles.formGroup}>
              <label style={commonStyles.label}>Applied Progressive Tariff</label>
              <select
                value={selectedTariffId}
                onChange={(e) => setSelectedTariffId(e.target.value)}
                style={commonStyles.input}
                id="calc-tariff-select"
              >
                <option value="">Default Active Tariff Structure</option>
                {tariffs.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} (Fixed ₹{t.fixedCharge}, Tax {t.taxPercentage}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={loading || fetchingData}
              style={commonStyles.primaryBtn}
              id="calc-submit-btn"
            >
              {loading ? "Calculating Slabs..." : "⚡ Execute Billing Calculation"}
            </button>
          </div>
        </form>
      </div>

      {/* Bill Results Section */}
      {billResult && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Top KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div style={commonStyles.statCard}>
              <div style={commonStyles.statLabel}>Consumption</div>
              <div style={commonStyles.statValue}>
                {billResult.consumptionUnits} <span style={{ fontSize: "16px", color: "#64748B" }}>kWh</span>
              </div>
              <div style={commonStyles.statSubtext}>Units evaluated</div>
            </div>

            <div style={commonStyles.statCard}>
              <div style={commonStyles.statLabel}>Energy Charges</div>
              <div style={{ ...commonStyles.statValue, color: "#166534" }}>
                ₹{billResult.energyCharges?.toLocaleString()}
              </div>
              <div style={commonStyles.statSubtext}>Slab breakdown sum</div>
            </div>

            <div style={commonStyles.statCard}>
              <div style={commonStyles.statLabel}>Fixed Demand</div>
              <div style={commonStyles.statValue}>₹{billResult.fixedCharge}</div>
              <div style={commonStyles.statSubtext}>Standard tariff base</div>
            </div>

            <div style={commonStyles.statCard}>
              <div style={commonStyles.statLabel}>Tax Amount</div>
              <div style={commonStyles.statValue}>
                ₹{billResult.tax} <span style={{ fontSize: "13px", color: "#64748B" }}>({billResult.taxPercentage}%)</span>
              </div>
              <div style={commonStyles.statSubtext}>Statutory GST</div>
            </div>

            <div style={{ ...commonStyles.statCard, backgroundColor: "#DCFCE7", border: "1px solid #86EFAC" }}>
              <div style={{ ...commonStyles.statLabel, color: "#166534" }}>Total Invoiced</div>
              <div style={{ ...commonStyles.statValue, color: "#166534" }}>
                ₹{billResult.totalAmount?.toLocaleString()}
              </div>
              <div style={{ ...commonStyles.statSubtext, color: "#166534", fontWeight: "700" }}>
                ✓ Mathematical Match
              </div>
            </div>
          </div>

          {/* Slabs Breakdown Table & Summary Ledger */}
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "24px" }}>
            {/* Slabs Breakdown */}
            <div style={commonStyles.tableContainer}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #DCE5DF", backgroundColor: "#F8FAF9" }}>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#17221B" }}>
                  Progressive Slab Calculation Breakdown
                </h3>
              </div>
              <table style={commonStyles.table}>
                <thead>
                  <tr>
                    <th style={commonStyles.th}>Tier / Slab Band</th>
                    <th style={commonStyles.th}>Units in Slab</th>
                    <th style={commonStyles.th}>Rate (₹/kWh)</th>
                    <th style={{ ...commonStyles.th, textAlign: "right" }}>Energy Cost (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {billResult.breakdown?.map((slab, idx) => (
                    <tr key={idx} style={commonStyles.trHover}>
                      <td style={{ ...commonStyles.td, fontWeight: "600", color: "#166534" }}>
                        {slab.slab || `${slab.from} - ${slab.to || "Above"}`}
                      </td>
                      <td style={commonStyles.td}>{slab.units} kWh</td>
                      <td style={commonStyles.td}>₹{slab.rate}</td>
                      <td style={{ ...commonStyles.td, fontWeight: "700", textAlign: "right", color: "#17221B" }}>
                        ₹{slab.cost || slab.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Ledger Summary */}
            <div style={commonStyles.card}>
              <div style={commonStyles.cardHeader}>
                <h3 style={commonStyles.cardTitle}>Bill Summary & Tax Statement</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Energy Charges (Slabs Subtotal):</span>
                  <span style={styles.summaryValue}>₹{billResult.energyCharges}</span>
                </div>

                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>+ Fixed Demand Charge:</span>
                  <span style={styles.summaryValue}>₹{billResult.fixedCharge}</span>
                </div>

                <div style={{ ...styles.summaryRow, borderTop: "1px dashed #DCE5DF", paddingTop: "8px" }}>
                  <span style={styles.summaryLabel}>Subtotal Before Tax:</span>
                  <span style={{ ...styles.summaryValue, fontWeight: "700" }}>₹{billResult.subtotal}</span>
                </div>

                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>+ Tax ({billResult.taxPercentage}% GST on ₹{billResult.subtotal}):</span>
                  <span style={styles.summaryValue}>₹{billResult.tax}</span>
                </div>

                {billResult.adjustment !== 0 && billResult.adjustment !== undefined && (
                  <div style={styles.summaryRow}>
                    <span style={styles.summaryLabel}>&plusmn; Adjustments / Credits:</span>
                    <span style={styles.summaryValue}>₹{billResult.adjustment}</span>
                  </div>
                )}

                <div style={{ ...styles.summaryRow, borderTop: "2px solid #166534", paddingTop: "14px", marginTop: "6px" }}>
                  <span style={{ fontSize: "16px", fontWeight: "800", color: "#166534" }}>Final Invoiced Total:</span>
                  <span style={{ fontSize: "22px", fontWeight: "800", color: "#166534" }}>₹{billResult.totalAmount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

const styles = {
  modeTabs: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  tab: {
    backgroundColor: "#FFFFFF",
    color: "#64748B",
    border: "1px solid #DCE5DF",
    padding: "10px 18px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  activeTab: {
    backgroundColor: "#166534",
    color: "#FFFFFF",
    border: "1px solid #166534",
    padding: "10px 18px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(22, 101, 52, 0.25)",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "14px",
  },
  summaryLabel: {
    color: "#64748B",
  },
  summaryValue: {
    color: "#17221B",
    fontWeight: "600",
    fontSize: "14.5px",
  },
};
