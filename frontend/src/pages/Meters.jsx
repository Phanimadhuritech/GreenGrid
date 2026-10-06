import React, { useState, useEffect } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import { commonStyles } from "../theme";

export default function Meters({ roleContext = null }) {
  const { user } = useAuth();
  const [meters, setMeters] = useState([]);
  const [units, setUnits] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [selectedUnitFilter, setSelectedUnitFilter] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingMeter, setEditingMeter] = useState(null);
  const [formData, setFormData] = useState({
    unit: "",
    meterNumber: "",
    type: "ELECTRICITY",
    installationDate: new Date().toISOString().split("T")[0],
    status: "ACTIVE",
    lastReading: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  const canManage = ["PLATFORM_ADMIN", "FACILITY_MANAGER"].includes(user?.role);

  const fetchUnitsAndBuildings = async () => {
    try {
      const [unitsRes, bldsRes] = await Promise.all([
        API.get("/units"),
        API.get("/buildings"),
      ]);
      setUnits(unitsRes.data.units || []);
      setBuildings(bldsRes.data.buildings || []);
    } catch (err) {
      console.error("Failed to load reference units/buildings:", err);
    }
  };

  const fetchMeters = async () => {
    try {
      setLoading(true);
      setError("");
      let url = "/meters";
      if (selectedUnitFilter) {
        url += `?unit=${selectedUnitFilter}`;
      }
      const res = await API.get(url);
      setMeters(res.data.meters || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load meters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      if (canManage) {
        fetchUnitsAndBuildings();
        fetchMeters();
      } else {
        setLoading(false);
      }
    }
  }, [user, selectedUnitFilter]);

  const openCreateModal = () => {
    setEditingMeter(null);
    setFormData({
      unit: selectedUnitFilter || (units[0]?._id || ""),
      meterNumber: "",
      type: "ELECTRICITY",
      installationDate: new Date().toISOString().split("T")[0],
      status: "ACTIVE",
      lastReading: 0,
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (meter) => {
    setEditingMeter(meter);
    setFormData({
      unit: meter.unit?._id || meter.unit || "",
      meterNumber: meter.meterNumber || "",
      type: meter.type || meter.meterType || "ELECTRICITY",
      installationDate: meter.installationDate
        ? new Date(meter.installationDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      status: meter.status || "ACTIVE",
      lastReading: meter.lastReading || 0,
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingMeter(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "lastReading" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.unit) {
      setError("Please select a target unit for the meter");
      return;
    }

    if (!formData.meterNumber.trim()) {
      setError("Meter identifier number is required");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      if (editingMeter) {
        const res = await API.put(`/meters/${editingMeter._id}`, formData);
        setSuccess(`Meter "${res.data.meter.meterNumber}" updated successfully.`);
      } else {
        const res = await API.post("/meters", formData);
        setSuccess(`Meter "${res.data.meter.meterNumber}" registered successfully.`);
      }

      closeModal();
      fetchMeters();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save meter details");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, meterNumber) => {
    if (!window.confirm(`Are you sure you want to delete meter "${meterNumber}"?`)) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      await API.delete(`/meters/${id}`);
      setSuccess(`Meter "${meterNumber}" deleted successfully.`);
      fetchMeters();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete meter");
    }
  };

  // Filter calculations
  const filteredMeters = meters.filter((m) => {
    if (selectedStatusFilter !== "ALL" && m.status !== selectedStatusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchNum = m.meterNumber?.toLowerCase().includes(q);
      const matchUnit = m.unit?.unitNumber?.toLowerCase().includes(q);
      const matchBld = m.unit?.building?.name?.toLowerCase().includes(q);
      if (!matchNum && !matchUnit && !matchBld) return false;
    }
    return true;
  });

  const totalMeters = meters.length;
  const activeMeters = meters.filter((m) => m.status === "ACTIVE").length;
  const maintenanceMeters = meters.filter((m) => m.status === "MAINTENANCE" || m.status === "FAULTY").length;

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
            Meter management is restricted to Platform Administrators and Facility Managers. Residents can track their usage in the My Energy Consumption page.
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
          <h1 style={commonStyles.pageTitle}>Electricity Meters</h1>
          <p style={commonStyles.pageSubtitle}>
            Manage smart energy meters, unit bindings, telemetry statuses, and diagnostic lifecycles.
          </p>
        </div>
        <div style={commonStyles.headerActions}>
          {canManage && (
            <button onClick={openCreateModal} style={commonStyles.primaryBtn}>
              <span>+</span>
              <span>Register Meter</span>
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
          <div style={commonStyles.statLabel}>Total Provisioned</div>
          <div style={commonStyles.statValue}>{totalMeters}</div>
          <div style={commonStyles.statSubtext}>Connected hardware</div>
        </div>

        <div style={commonStyles.statCard}>
          <div style={commonStyles.statLabel}>Active Grid Telemetry</div>
          <div style={{ ...commonStyles.statValue, color: "#166534" }}>{activeMeters}</div>
          <div style={commonStyles.statSubtext}>Online & recording</div>
        </div>

        <div style={commonStyles.statCard}>
          <div style={commonStyles.statLabel}>Maintenance / Fault</div>
          <div style={{ ...commonStyles.statValue, color: maintenanceMeters > 0 ? "#D97706" : "#0F766E" }}>
            {maintenanceMeters}
          </div>
          <div style={commonStyles.statSubtext}>Requires inspection</div>
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
            placeholder="🔍 Search by meter number, unit, building..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={commonStyles.input}
          />
        </div>

        {units.length > 0 && (
          <div style={{ width: "220px" }}>
            <select
              value={selectedUnitFilter}
              onChange={(e) => setSelectedUnitFilter(e.target.value)}
              style={{ ...commonStyles.input, cursor: "pointer" }}
            >
              <option value="">All Units</option>
              {units.map((u) => (
                <option key={u._id} value={u._id}>
                  Unit {u.unitNumber} ({u.building?.name || "BLD"})
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
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
            <option value="FAULTY">FAULTY</option>
          </select>
        </div>
      </div>

      {/* Main Table View */}
      <div style={commonStyles.tableContainer}>
        {loading ? (
          <div style={commonStyles.loadingSpinner}>
            <span>🌿</span> Loading meters...
          </div>
        ) : filteredMeters.length === 0 ? (
          <div style={commonStyles.emptyState}>
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>⚡</div>
            <h3 style={{ margin: "0 0 6px 0", color: "#17221B" }}>No Meters Found</h3>
            <p style={{ margin: 0 }}>
              {search || selectedStatusFilter !== "ALL" || selectedUnitFilter
                ? "No meters match the selected filters."
                : "No smart meters registered yet."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={commonStyles.table}>
              <thead>
                <tr>
                  <th style={commonStyles.th}>Meter Number</th>
                  <th style={commonStyles.th}>Assigned Unit</th>
                  <th style={commonStyles.th}>Building</th>
                  <th style={commonStyles.th}>Type</th>
                  <th style={commonStyles.th}>Last Reading</th>
                  <th style={commonStyles.th}>Installation Date</th>
                  <th style={commonStyles.th}>Status</th>
                  {canManage && <th style={{ ...commonStyles.th, textAlign: "right" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredMeters.map((m) => (
                  <tr key={m._id} style={commonStyles.trHover}>
                    <td style={{ ...commonStyles.td, fontFamily: "monospace", fontWeight: "700", color: "#166534" }}>
                      ⚡ {m.meterNumber}
                    </td>
                    <td style={{ ...commonStyles.td, fontWeight: "600" }}>
                      {m.unit?.unitNumber ? `Unit ${m.unit.unitNumber}` : "Unassigned"}
                    </td>
                    <td style={commonStyles.td}>
                      {m.unit?.building?.name || "—"}
                    </td>
                    <td style={{ ...commonStyles.td, color: "#64748B", fontSize: "12.5px" }}>
                      {m.type || m.meterType || "ELECTRICITY"}
                    </td>
                    <td style={{ ...commonStyles.td, fontWeight: "700", color: "#0F766E" }}>
                      {Number(m.lastReading || 0).toLocaleString()} kWh
                    </td>
                    <td style={{ ...commonStyles.td, color: "#64748B", fontSize: "13px" }}>
                      {m.installationDate ? new Date(m.installationDate).toLocaleDateString() : "—"}
                    </td>
                    <td style={commonStyles.td}>
                      {m.status === "ACTIVE" ? (
                        <span style={commonStyles.badgeActive}>✓ ACTIVE</span>
                      ) : m.status === "MAINTENANCE" ? (
                        <span style={commonStyles.badgeMaintenance}>⚠️ MAINTENANCE</span>
                      ) : m.status === "FAULTY" ? (
                        <span style={commonStyles.badgeCritical}>✕ FAULTY</span>
                      ) : (
                        <span style={commonStyles.badgeNeutral}>{m.status || "INACTIVE"}</span>
                      )}
                    </td>
                    {canManage && (
                      <td style={{ ...commonStyles.td, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => openEditModal(m)}
                            style={{
                              ...commonStyles.outlineBtn,
                              padding: "6px 12px",
                              fontSize: "12.5px",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(m._id, m.meterNumber)}
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
                {editingMeter ? "Edit Meter Details" : "Register Smart Meter"}
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
                <label style={commonStyles.label}>Target Unit *</label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  required
                  style={commonStyles.input}
                >
                  <option value="">Select Target Unit</option>
                  {units.map((u) => (
                    <option key={u._id} value={u._id}>
                      Unit {u.unitNumber} — {u.building?.name || "Building"}
                    </option>
                  ))}
                </select>
              </div>

              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Meter Serial Number / Code *</label>
                <input
                  type="text"
                  name="meterNumber"
                  placeholder="e.g. MTR-2026-104"
                  value={formData.meterNumber}
                  onChange={handleInputChange}
                  required
                  style={commonStyles.input}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={commonStyles.formGroup}>
                  <label style={commonStyles.label}>Meter Utility Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    style={commonStyles.input}
                  >
                    <option value="ELECTRICITY">ELECTRICITY</option>
                    <option value="WATER">WATER</option>
                    <option value="GAS">GAS</option>
                    <option value="SOLAR">SOLAR</option>
                  </select>
                </div>

                <div style={commonStyles.formGroup}>
                  <label style={commonStyles.label}>Operational Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    style={commonStyles.input}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="FAULTY">FAULTY</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={commonStyles.formGroup}>
                  <label style={commonStyles.label}>Initial Reading (kWh)</label>
                  <input
                    type="number"
                    name="lastReading"
                    min="0"
                    step="0.1"
                    value={formData.lastReading}
                    onChange={handleInputChange}
                    style={commonStyles.input}
                  />
                </div>

                <div style={commonStyles.formGroup}>
                  <label style={commonStyles.label}>Installation Date</label>
                  <input
                    type="date"
                    name="installationDate"
                    value={formData.installationDate}
                    onChange={handleInputChange}
                    style={commonStyles.input}
                  />
                </div>
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
                  {submitting ? "Saving..." : editingMeter ? "Update Meter" : "Register Meter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
