import React, { useState, useEffect } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import { commonStyles } from "../theme";

export default function Units() {
  const { user } = useAuth();
  const [units, setUnits] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [formData, setFormData] = useState({
    building: "",
    unitNumber: "",
    floor: 1,
    type: "APARTMENT",
    status: "VACANT",
  });
  const [submitting, setSubmitting] = useState(false);

  const canManage = ["PLATFORM_ADMIN", "FACILITY_MANAGER"].includes(user?.role);

  const fetchBuildings = async () => {
    try {
      const response = await API.get("/buildings");
      setBuildings(response.data.buildings || []);
    } catch (err) {
      console.error("Failed to load buildings for dropdown:", err);
    }
  };

  const fetchUnits = async (buildingId = "") => {
    try {
      setLoading(true);
      setError("");
      const url = buildingId ? `/units?building=${buildingId}` : "/units";
      const response = await API.get(url);
      setUnits(response.data.units || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load units");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      if (canManage) {
        fetchBuildings();
        fetchUnits(selectedBuildingFilter);
      } else {
        setLoading(false);
      }
    }
  }, [user, selectedBuildingFilter]);

  const openCreateModal = () => {
    setEditingUnit(null);
    setFormData({
      building: selectedBuildingFilter || (buildings[0]?._id || ""),
      unitNumber: "",
      floor: 1,
      type: "APARTMENT",
      status: "VACANT",
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (unit) => {
    setEditingUnit(unit);
    setFormData({
      building: unit.building?._id || unit.building || "",
      unitNumber: unit.unitNumber || "",
      floor: unit.floor || 1,
      type: unit.type || "APARTMENT",
      status: unit.status || "VACANT",
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUnit(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "floor" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.building) {
      setError("Please select a building");
      return;
    }

    if (!formData.unitNumber.trim()) {
      setError("Unit number is required");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      if (editingUnit) {
        const res = await API.put(`/units/${editingUnit._id}`, formData);
        setSuccess(`Unit "${res.data.unit.unitNumber}" updated successfully.`);
      } else {
        const res = await API.post("/units", formData);
        setSuccess(`Unit "${res.data.unit.unitNumber}" created successfully.`);
      }

      closeModal();
      fetchUnits(selectedBuildingFilter);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save unit");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, unitNumber) => {
    if (!window.confirm(`Are you sure you want to delete unit "${unitNumber}"?`)) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      await API.delete(`/units/${id}`);
      setSuccess(`Unit "${unitNumber}" deleted successfully.`);
      fetchUnits(selectedBuildingFilter);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete unit");
    }
  };

  // Filter calculations
  const filteredUnits = units.filter((u) => {
    if (statusFilter !== "ALL" && u.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchNum = u.unitNumber?.toLowerCase().includes(q);
      const matchBld = u.building?.name?.toLowerCase().includes(q);
      const matchType = u.type?.toLowerCase().includes(q);
      if (!matchNum && !matchBld && !matchType) return false;
    }
    return true;
  });

  const totalUnits = units.length;
  const occupiedUnits = units.filter((u) => u.status === "OCCUPIED").length;
  const vacantUnits = units.filter((u) => u.status === "VACANT").length;

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
          <span style={{ fontSize: "40px" }}>🏢</span>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#17221B", margin: "14px 0 8px" }}>
            Access Restricted
          </h2>
          <p style={{ fontSize: "14px", color: "#64748B", margin: "0 0 20px" }}>
            Unit registry and tenancy management is restricted to Platform Administrators and Facility Managers.
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
          <h1 style={commonStyles.pageTitle}>Units & Occupancy</h1>
          <p style={commonStyles.pageSubtitle}>
            Manage individual flats, apartments, offices, floors, and resident assignments.
          </p>
        </div>
        <div style={commonStyles.headerActions}>
          {canManage && (
            <button onClick={openCreateModal} style={commonStyles.primaryBtn}>
              <span>+</span>
              <span>Add Unit</span>
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
          <div style={commonStyles.statLabel}>Total Units</div>
          <div style={commonStyles.statValue}>{totalUnits}</div>
          <div style={commonStyles.statSubtext}>Across all properties</div>
        </div>

        <div style={commonStyles.statCard}>
          <div style={commonStyles.statLabel}>Occupied Units</div>
          <div style={{ ...commonStyles.statValue, color: "#166534" }}>{occupiedUnits}</div>
          <div style={commonStyles.statSubtext}>Active residents</div>
        </div>

        <div style={commonStyles.statCard}>
          <div style={commonStyles.statLabel}>Vacant Units</div>
          <div style={{ ...commonStyles.statValue, color: "#0F766E" }}>{vacantUnits}</div>
          <div style={commonStyles.statSubtext}>Available for lease</div>
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
            placeholder="🔍 Search by unit number, building, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={commonStyles.input}
          />
        </div>

        {buildings.length > 0 && (
          <div style={{ width: "220px" }}>
            <select
              value={selectedBuildingFilter}
              onChange={(e) => setSelectedBuildingFilter(e.target.value)}
              style={{ ...commonStyles.input, cursor: "pointer" }}
            >
              <option value="">All Buildings</option>
              {buildings.map((bld) => (
                <option key={bld._id} value={bld._id}>
                  {bld.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ width: "160px" }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ ...commonStyles.input, cursor: "pointer" }}
          >
            <option value="ALL">All Statuses</option>
            <option value="OCCUPIED">OCCUPIED</option>
            <option value="VACANT">VACANT</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
          </select>
        </div>
      </div>

      {/* Main Table View */}
      <div style={commonStyles.tableContainer}>
        {loading ? (
          <div style={commonStyles.loadingSpinner}>
            <span>🌿</span> Loading units...
          </div>
        ) : filteredUnits.length === 0 ? (
          <div style={commonStyles.emptyState}>
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>🚪</div>
            <h3 style={{ margin: "0 0 6px 0", color: "#17221B" }}>No Units Found</h3>
            <p style={{ margin: 0 }}>
              {search || statusFilter !== "ALL" || selectedBuildingFilter
                ? "No units match the selected filters."
                : "No units created yet."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={commonStyles.table}>
              <thead>
                <tr>
                  <th style={commonStyles.th}>Unit Number</th>
                  <th style={commonStyles.th}>Building</th>
                  <th style={commonStyles.th}>Floor</th>
                  <th style={commonStyles.th}>Type</th>
                  <th style={commonStyles.th}>Status</th>
                  {canManage && <th style={{ ...commonStyles.th, textAlign: "right" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredUnits.map((u) => (
                  <tr key={u._id} style={commonStyles.trHover}>
                    <td style={{ ...commonStyles.td, fontWeight: "700", color: "#166534" }}>
                      🚪 Unit {u.unitNumber}
                    </td>
                    <td style={commonStyles.td}>
                      {u.building?.name || "—"}
                    </td>
                    <td style={{ ...commonStyles.td, fontWeight: "600" }}>
                      Floor {u.floor || 1}
                    </td>
                    <td style={{ ...commonStyles.td, color: "#64748B" }}>
                      {u.type || "APARTMENT"}
                    </td>
                    <td style={commonStyles.td}>
                      {u.status === "OCCUPIED" ? (
                        <span style={commonStyles.badgeActive}>✓ OCCUPIED</span>
                      ) : u.status === "VACANT" ? (
                        <span style={{ ...commonStyles.badgeNeutral, backgroundColor: "#E0F2FE", color: "#0369A1" }}>
                          ○ VACANT
                        </span>
                      ) : (
                        <span style={commonStyles.badgeMaintenance}>⚠️ {u.status || "MAINTENANCE"}</span>
                      )}
                    </td>
                    {canManage && (
                      <td style={{ ...commonStyles.td, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => openEditModal(u)}
                            style={{
                              ...commonStyles.outlineBtn,
                              padding: "6px 12px",
                              fontSize: "12.5px",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(u._id, u.unitNumber)}
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
                {editingUnit ? "Edit Unit" : "Add New Unit"}
              </h3>
              <button
                onClick={closeModal}
                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#64748B" }}
              >
                ✕
              </button>
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: "#FEF2F2",
                  border: "1px solid #FECACA",
                  color: "#991B1B",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  fontSize: "13px",
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Building *</label>
                <select
                  name="building"
                  value={formData.building}
                  onChange={handleInputChange}
                  required
                  style={commonStyles.input}
                >
                  <option value="">Select Building</option>
                  {buildings.map((bld) => (
                    <option key={bld._id} value={bld._id}>
                      {bld.name} ({bld.code || "BLD"})
                    </option>
                  ))}
                </select>
              </div>

              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Unit Number / Flat Code *</label>
                <input
                  type="text"
                  name="unitNumber"
                  placeholder="e.g. 101, A-204"
                  value={formData.unitNumber}
                  onChange={handleInputChange}
                  required
                  style={commonStyles.input}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={commonStyles.formGroup}>
                  <label style={commonStyles.label}>Floor Number</label>
                  <input
                    type="number"
                    name="floor"
                    min="0"
                    value={formData.floor}
                    onChange={handleInputChange}
                    style={commonStyles.input}
                  />
                </div>

                <div style={commonStyles.formGroup}>
                  <label style={commonStyles.label}>Unit Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    style={commonStyles.input}
                  >
                    <option value="APARTMENT">APARTMENT</option>
                    <option value="OFFICE">OFFICE</option>
                    <option value="SHOP">SHOP</option>
                    <option value="RETAIL">RETAIL</option>
                    <option value="COMMON_AREA">COMMON_AREA</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
              </div>

              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Occupancy Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  style={commonStyles.input}
                >
                  <option value="VACANT">VACANT</option>
                  <option value="OCCUPIED">OCCUPIED</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                </select>
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
                  {submitting ? "Saving..." : editingUnit ? "Update Unit" : "Create Unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
