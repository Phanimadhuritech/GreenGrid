import React, { useState, useEffect } from "react";
import API from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import AppLayout from "../../components/AppLayout";
import { commonStyles } from "../../theme";

export default function Readings() {
  const { user } = useAuth();
  const [readings, setReadings] = useState([]);
  const [meters, setMeters] = useState([]);
  const [selectedMeterFilter, setSelectedMeterFilter] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingReading, setEditingReading] = useState(null);
  const [formData, setFormData] = useState({
    meter: "",
    readingValue: "",
    readingDate: new Date().toISOString().split("T")[0],
    source: "MANUAL",
    status: "VERIFIED",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const canManage = ["PLATFORM_ADMIN", "FACILITY_MANAGER", "TECHNICIAN"].includes(user?.role);

  const fetchMeters = async () => {
    try {
      const res = await API.get("/meters");
      setMeters(res.data.meters || []);
    } catch (err) {
      console.error("Failed to load reference meters:", err);
    }
  };

  const fetchReadings = async () => {
    try {
      setLoading(true);
      setError("");
      let url = "/readings";
      if (selectedMeterFilter) {
        url += `?meter=${selectedMeterFilter}`;
      }
      const res = await API.get(url);
      setReadings(res.data.readings || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load readings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      if (canManage) {
        if (["PLATFORM_ADMIN", "FACILITY_MANAGER"].includes(user.role)) {
          fetchMeters();
        }
        fetchReadings();
      } else {
        setLoading(false);
      }
    }
  }, [user, selectedMeterFilter]);

  const openCreateModal = () => {
    setEditingReading(null);
    setFormData({
      meter: selectedMeterFilter || (meters[0]?._id || ""),
      readingValue: "",
      readingDate: new Date().toISOString().split("T")[0],
      source: "MANUAL",
      status: "VERIFIED",
      notes: "",
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (reading) => {
    setEditingReading(reading);
    setFormData({
      meter: reading.meter?._id || reading.meter || "",
      readingValue: reading.readingValue || "",
      readingDate: reading.readingDate
        ? new Date(reading.readingDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      source: reading.source || "MANUAL",
      status: reading.status || "VERIFIED",
      notes: reading.notes || "",
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingReading(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "readingValue" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.meter) {
      setError("Please select a target smart meter");
      return;
    }

    if (formData.readingValue === "" || isNaN(formData.readingValue)) {
      setError("Valid numerical reading value is required");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      if (editingReading) {
        await API.put(`/readings/${editingReading._id}`, formData);
        setSuccess("Meter reading updated successfully.");
      } else {
        await API.post("/readings", formData);
        setSuccess("New meter reading recorded successfully.");
      }

      closeModal();
      fetchReadings();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to log meter reading");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this meter reading?")) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      await API.delete(`/readings/${id}`);
      setSuccess("Reading deleted successfully.");
      fetchReadings();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete reading");
    }
  };

  // Filter calculations
  const filteredReadings = readings.filter((r) => {
    if (selectedStatusFilter !== "ALL" && r.status !== selectedStatusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchMeter = r.meter?.meterNumber?.toLowerCase().includes(q);
      const matchUnit = r.meter?.unit?.unitNumber?.toLowerCase().includes(q);
      const matchSource = r.source?.toLowerCase().includes(q);
      if (!matchMeter && !matchUnit && !matchSource) return false;
    }
    return true;
  });

  const totalReadings = readings.length;
  const verifiedReadings = readings.filter((r) => r.status === "VERIFIED").length;
  const totalKWhLogged = readings.reduce((s, r) => s + (r.consumption || r.readingValue || 0), 0);

  if (!canManage) {
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
          <span style={{ fontSize: "40px" }}>⚡</span>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#17221B", margin: "14px 0 8px" }}>
            Access Restricted
          </h2>
          <p style={{ fontSize: "14px", color: "#64748B", margin: "0 0 20px" }}>
            Meter telemetry and readings management is restricted to Facility Managers and Field Technicians. Residents can track their usage in the My Energy Consumption page.
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
          <h1 style={commonStyles.pageTitle}>Meter Telemetry & Readings</h1>
          <p style={commonStyles.pageSubtitle}>
            Record chronological meter values, monitor delta energy consumption, and verify telemetry logs.
          </p>
        </div>
        <div style={commonStyles.headerActions}>
          {canManage && (
            <button onClick={openCreateModal} style={commonStyles.primaryBtn}>
              <span>+</span>
              <span>Log Reading</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
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

      {success && (
        <div
          style={{
            padding: "12px 18px",
            backgroundColor: "#DCFCE7",
            border: "1px solid #86EFAC",
            color: "#166534",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          ✓ {success}
        </div>
      )}

      {/* KPI Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div style={commonStyles.statCard}>
          <div style={commonStyles.statLabel}>Total Telemetry Logs</div>
          <div style={commonStyles.statValue}>{totalReadings}</div>
          <div style={commonStyles.statSubtext}>Recorded data points</div>
        </div>

        <div style={commonStyles.statCard}>
          <div style={commonStyles.statLabel}>Verified Readings</div>
          <div style={{ ...commonStyles.statValue, color: "#166534" }}>{verifiedReadings}</div>
          <div style={commonStyles.statSubtext}>Audit validated</div>
        </div>

        <div style={commonStyles.statCard}>
          <div style={commonStyles.statLabel}>Total Consumption Load</div>
          <div style={{ ...commonStyles.statValue, color: "#0F766E" }}>
            {Number(totalKWhLogged.toFixed(1)).toLocaleString()} kWh
          </div>
          <div style={commonStyles.statSubtext}>Aggregated energy</div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #DCE5DF",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "24px",
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          alignItems: "center",
          boxShadow: "0 1px 3px rgba(15, 61, 46, 0.05)",
        }}
      >
        <div style={{ flex: 1, minWidth: "220px" }}>
          <input
            type="text"
            placeholder="🔍 Search by meter, unit, source..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={commonStyles.input}
          />
        </div>

        {meters.length > 0 && (
          <div style={{ width: "220px" }}>
            <select
              value={selectedMeterFilter}
              onChange={(e) => setSelectedMeterFilter(e.target.value)}
              style={{ ...commonStyles.input, cursor: "pointer" }}
            >
              <option value="">All Smart Meters</option>
              {meters.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.meterNumber} ({m.unit?.unitNumber ? `Unit ${m.unit.unitNumber}` : "Unassigned"})
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ width: "160px" }}>
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            style={{ ...commonStyles.input, cursor: "pointer" }}
          >
            <option value="ALL">All Statuses</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="PENDING">PENDING</option>
            <option value="ESTIMATED">ESTIMATED</option>
          </select>
        </div>
      </div>

      {/* Main Table View */}
      <div style={commonStyles.tableContainer}>
        {loading ? (
          <div style={commonStyles.loadingSpinner}>
            <span>🌿</span> Loading readings...
          </div>
        ) : filteredReadings.length === 0 ? (
          <div style={commonStyles.emptyState}>
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>📈</div>
            <h3 style={{ margin: "0 0 6px 0", color: "#17221B" }}>No Telemetry Readings Found</h3>
            <p style={{ margin: 0 }}>
              {search || selectedStatusFilter !== "ALL" || selectedMeterFilter
                ? "No readings match the selected filters."
                : "No readings logged yet."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={commonStyles.table}>
              <thead>
                <tr>
                  <th style={commonStyles.th}>Meter Number</th>
                  <th style={commonStyles.th}>Target Unit</th>
                  <th style={commonStyles.th}>Reading Date</th>
                  <th style={commonStyles.th}>Meter Reading</th>
                  <th style={commonStyles.th}>Delta Consumption</th>
                  <th style={commonStyles.th}>Source</th>
                  <th style={commonStyles.th}>Status</th>
                  {canManage && <th style={{ ...commonStyles.th, textAlign: "right" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredReadings.map((r) => (
                  <tr key={r._id} style={commonStyles.trHover}>
                    <td style={{ ...commonStyles.td, fontFamily: "monospace", fontWeight: "700", color: "#166534" }}>
                      ⚡ {r.meter?.meterNumber || "—"}
                    </td>
                    <td style={{ ...commonStyles.td, fontWeight: "600" }}>
                      {r.meter?.unit?.unitNumber ? `Unit ${r.meter.unit.unitNumber}` : "—"}
                    </td>
                    <td style={{ ...commonStyles.td, color: "#64748B", fontSize: "13px" }}>
                      {r.readingDate ? new Date(r.readingDate).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ ...commonStyles.td, fontWeight: "800", color: "#17221B" }}>
                      {Number(r.readingValue || 0).toLocaleString()} kWh
                    </td>
                    <td style={{ ...commonStyles.td, fontWeight: "700", color: "#0F766E" }}>
                      {r.consumption !== undefined ? `+${Number(r.consumption).toLocaleString()} kWh` : "—"}
                    </td>
                    <td style={{ ...commonStyles.td, color: "#64748B", fontSize: "12.5px" }}>
                      {r.source || "MANUAL"}
                    </td>
                    <td style={commonStyles.td}>
                      {r.status === "VERIFIED" ? (
                        <span style={commonStyles.badgeActive}>✓ VERIFIED</span>
                      ) : r.status === "PENDING" ? (
                        <span style={commonStyles.badgeMaintenance}>⏳ PENDING</span>
                      ) : (
                        <span style={commonStyles.badgeNeutral}>{r.status || "ESTIMATED"}</span>
                      )}
                    </td>
                    {canManage && (
                      <td style={{ ...commonStyles.td, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => openEditModal(r)}
                            style={{
                              ...commonStyles.outlineBtn,
                              padding: "6px 12px",
                              fontSize: "12.5px",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(r._id)}
                            style={{
                              ...commonStyles.dangerBtn,
                              padding: "6px 12px",
                              fontSize: "12.5px",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={commonStyles.modalOverlay} onClick={closeModal}>
          <div style={commonStyles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={commonStyles.cardHeader}>
              <h3 style={commonStyles.cardTitle}>
                {editingReading ? "Edit Telemetry Reading" : "Log Meter Reading"}
              </h3>
              <button
                onClick={closeModal}
                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#64748B" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Target Smart Meter *</label>
                <select
                  name="meter"
                  value={formData.meter}
                  onChange={handleInputChange}
                  required
                  style={commonStyles.input}
                >
                  <option value="">Select Smart Meter</option>
                  {meters.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.meterNumber} — Unit {m.unit?.unitNumber || "Unassigned"} ({m.unit?.building?.name || "Building"})
                    </option>
                  ))}
                </select>
              </div>

              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Cumulative Meter Reading (kWh) *</label>
                <input
                  type="number"
                  name="readingValue"
                  placeholder="e.g. 1250.5"
                  step="0.01"
                  min="0"
                  value={formData.readingValue}
                  onChange={handleInputChange}
                  required
                  style={commonStyles.input}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={commonStyles.formGroup}>
                  <label style={commonStyles.label}>Reading Date</label>
                  <input
                    type="date"
                    name="readingDate"
                    value={formData.readingDate}
                    onChange={handleInputChange}
                    style={commonStyles.input}
                  />
                </div>

                <div style={commonStyles.formGroup}>
                  <label style={commonStyles.label}>Telemetry Source</label>
                  <select
                    name="source"
                    value={formData.source}
                    onChange={handleInputChange}
                    style={commonStyles.input}
                  >
                    <option value="MANUAL">MANUAL ENTRY</option>
                    <option value="SMART_IOT">SMART IOT PULSE</option>
                    <option value="OCR">OPTICAL OCR SCAN</option>
                  </select>
                </div>
              </div>

              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Verification Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  style={commonStyles.input}
                >
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="ESTIMATED">ESTIMATED</option>
                </select>
              </div>

              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Technician Notes (Optional)</label>
                <textarea
                  name="notes"
                  placeholder="Optional observations regarding meter display or inspection..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{ ...commonStyles.input, minHeight: "70px", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  style={commonStyles.outlineBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={commonStyles.primaryBtn}
                >
                  {submitting ? "Saving..." : editingReading ? "Update Reading" : "Log Reading"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
