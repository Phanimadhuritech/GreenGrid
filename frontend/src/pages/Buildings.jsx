import React, { useState, useEffect } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import { commonStyles } from "../theme";

export default function Buildings() {
  const { user, getCurrentUser } = useAuth();
  const [buildings, setBuildings] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgFilter, setSelectedOrgFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [formData, setFormData] = useState({
    organization: "",
    name: "",
    code: "",
    address: "",
    numberOfFloors: 1,
    status: "ACTIVE",
  });
  const [submitting, setSubmitting] = useState(false);

  const canManage = ["PLATFORM_ADMIN", "FACILITY_MANAGER"].includes(user?.role);

  const fetchOrganizations = async () => {
    try {
      const response = await API.get("/organizations");
      setOrganizations(response.data.organizations || []);
    } catch (err) {
      console.error("Failed to load organizations for dropdown:", err);
    }
  };

  const fetchBuildings = async (orgId = "") => {
    try {
      setLoading(true);
      setError("");
      const url = orgId ? `/buildings?organization=${orgId}` : "/buildings";
      const response = await API.get(url);
      setBuildings(response.data.buildings || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load buildings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      if (canManage) {
        fetchOrganizations();
        fetchBuildings(selectedOrgFilter);
      } else {
        setLoading(false);
      }
    }
  }, [user, selectedOrgFilter]);

  const openCreateModal = () => {
    setEditingBuilding(null);
    const userOrgId = user?.organization?._id || (typeof user?.organization === "string" ? user?.organization : "");
    const defaultOrg = selectedOrgFilter || userOrgId || (organizations.length > 0 ? organizations[0]._id : "");
    setFormData({
      organization: defaultOrg,
      name: "",
      code: "",
      address: "",
      numberOfFloors: 1,
      status: "ACTIVE",
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (building) => {
    setEditingBuilding(building);
    setFormData({
      organization: building.organization?._id || building.organization || "",
      name: building.name || "",
      code: building.code || "",
      address: building.address || "",
      numberOfFloors: building.numberOfFloors || 1,
      status: building.status || "ACTIVE",
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBuilding(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "numberOfFloors" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const userOrgId = user?.organization?._id || (typeof user?.organization === "string" ? user?.organization : "");
    const orgToSubmit = formData.organization || userOrgId || selectedOrgFilter || (organizations.length > 0 ? organizations[0]._id : "");

    if (!orgToSubmit) {
      setError("Please select or assign an organization for this building.");
      return;
    }

    if (!formData.name.trim()) {
      setError("Building name is required");
      return;
    }
    if (!formData.code.trim()) {
      setError("Building code is required");
      return;
    }

    const payload = {
      ...formData,
      organization: orgToSubmit,
    };

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      if (editingBuilding) {
        const res = await API.put(`/buildings/${editingBuilding._id}`, payload);
        setSuccess(`Building "${res.data.building.name}" updated successfully.`);
      } else {
        const res = await API.post("/buildings", payload);
        setSuccess(`Building "${res.data.building.name}" created successfully.`);
      }

      closeModal();
      fetchBuildings(selectedOrgFilter);
      if (getCurrentUser) {
        getCurrentUser();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save building");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete building "${name}"?`)) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      await API.delete(`/buildings/${id}`);
      setSuccess(`Building "${name}" deleted successfully.`);
      fetchBuildings(selectedOrgFilter);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete building");
    }
  };

  // Filter calculations
  const filteredBuildings = buildings.filter((bld) => {
    if (statusFilter !== "ALL" && bld.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = bld.name?.toLowerCase().includes(q);
      const matchCode = bld.code?.toLowerCase().includes(q);
      const matchAddr = bld.address?.toLowerCase().includes(q);
      const matchOrg = bld.organization?.name?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchAddr && !matchOrg) return false;
    }
    return true;
  });

  const totalBuildings = buildings.length;
  const activeBuildings = buildings.filter((b) => b.status === "ACTIVE").length;
  const totalFloors = buildings.reduce((s, b) => s + (b.numberOfFloors || 0), 0);

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
            Building infrastructure management is restricted to Platform Administrators and Facility Managers.
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
          <h1 style={commonStyles.pageTitle}>Buildings & Infrastructure</h1>
          <p style={commonStyles.pageSubtitle}>
            Manage residential towers, commercial blocks, floors, and facility configurations.
          </p>
        </div>
        <div style={commonStyles.headerActions}>
          {canManage && (
            <button onClick={openCreateModal} style={commonStyles.primaryBtn}>
              <span>+</span>
              <span>Add Building</span>
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
          <div style={commonStyles.statLabel}>Total Buildings</div>
          <div style={commonStyles.statValue}>{totalBuildings}</div>
          <div style={commonStyles.statSubtext}>Registered structures</div>
        </div>

        <div style={commonStyles.statCard}>
          <div style={commonStyles.statLabel}>Active Status</div>
          <div style={{ ...commonStyles.statValue, color: "#166534" }}>{activeBuildings}</div>
          <div style={commonStyles.statSubtext}>Operational facilities</div>
        </div>

        <div style={commonStyles.statCard}>
          <div style={commonStyles.statLabel}>Total Floor Capacity</div>
          <div style={{ ...commonStyles.statValue, color: "#0F766E" }}>{totalFloors}</div>
          <div style={commonStyles.statSubtext}>Across all towers</div>
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
            placeholder="🔍 Search by name, code, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={commonStyles.input}
          />
        </div>

        {user?.role === "PLATFORM_ADMIN" && organizations.length > 0 && (
          <div style={{ width: "220px" }}>
            <select
              value={selectedOrgFilter}
              onChange={(e) => setSelectedOrgFilter(e.target.value)}
              style={{ ...commonStyles.input, cursor: "pointer" }}
            >
              <option value="">All Organizations</option>
              {organizations.map((org) => (
                <option key={org._id} value={org._id}>
                  {org.name}
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
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
          </select>
        </div>
      </div>

      {/* Main Table View */}
      <div style={commonStyles.tableContainer}>
        {loading ? (
          <div style={commonStyles.loadingSpinner}>
            <span>🌿</span> Loading buildings...
          </div>
        ) : filteredBuildings.length === 0 ? (
          <div style={commonStyles.emptyState}>
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>🏛️</div>
            <h3 style={{ margin: "0 0 6px 0", color: "#17221B" }}>No Buildings Found</h3>
            <p style={{ margin: 0 }}>
              {search || statusFilter !== "ALL" || selectedOrgFilter
                ? "No buildings match the selected filters."
                : "No buildings registered yet."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={commonStyles.table}>
              <thead>
                <tr>
                  <th style={commonStyles.th}>Building Name</th>
                  <th style={commonStyles.th}>Code</th>
                  <th style={commonStyles.th}>Organization</th>
                  <th style={commonStyles.th}>Address</th>
                  <th style={commonStyles.th}>Floors</th>
                  <th style={commonStyles.th}>Status</th>
                  {canManage && <th style={{ ...commonStyles.th, textAlign: "right" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredBuildings.map((bld) => (
                  <tr key={bld._id} style={commonStyles.trHover}>
                    <td style={{ ...commonStyles.td, fontWeight: "700", color: "#166534" }}>
                      🏛️ {bld.name}
                    </td>
                    <td style={{ ...commonStyles.td, fontFamily: "monospace", fontWeight: "600" }}>
                      {bld.code}
                    </td>
                    <td style={commonStyles.td}>
                      {bld.organization?.name || "—"}
                    </td>
                    <td style={{ ...commonStyles.td, color: "#64748B", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {bld.address || "—"}
                    </td>
                    <td style={{ ...commonStyles.td, fontWeight: "600" }}>
                      {bld.numberOfFloors || 1}
                    </td>
                    <td style={commonStyles.td}>
                      {bld.status === "ACTIVE" ? (
                        <span style={commonStyles.badgeActive}>✓ ACTIVE</span>
                      ) : bld.status === "MAINTENANCE" ? (
                        <span style={commonStyles.badgeMaintenance}>⚠️ MAINTENANCE</span>
                      ) : (
                        <span style={commonStyles.badgeNeutral}>{bld.status || "INACTIVE"}</span>
                      )}
                    </td>
                    {canManage && (
                      <td style={{ ...commonStyles.td, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => openEditModal(bld)}
                            style={{
                              ...commonStyles.outlineBtn,
                              padding: "6px 12px",
                              fontSize: "12.5px",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(bld._id, bld.name)}
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
                {editingBuilding ? "Edit Building" : "Add New Building"}
              </h3>
              <button
                onClick={closeModal}
                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#64748B" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Organization Selection / Display */}
              {user?.role === "PLATFORM_ADMIN" ? (
                <div style={commonStyles.formGroup}>
                  <label style={commonStyles.label}>Organization *</label>
                  <select
                    name="organization"
                    value={formData.organization}
                    onChange={handleInputChange}
                    required
                    style={commonStyles.input}
                  >
                    <option value="">Select Organization</option>
                    {organizations.map((org) => (
                      <option key={org._id} value={org._id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : user?.organization ? (
                <div style={commonStyles.formGroup}>
                  <label style={commonStyles.label}>Organization</label>
                  <input
                    type="text"
                    disabled
                    value={
                      typeof user.organization === "object"
                        ? user.organization.name || "Assigned Organization"
                        : organizations.find((o) => o._id === user.organization)?.name || "Assigned Organization"
                    }
                    style={{
                      ...commonStyles.input,
                      backgroundColor: "#F8FAF9",
                      color: "#475569",
                      cursor: "not-allowed",
                    }}
                  />
                </div>
              ) : (
                <div style={commonStyles.formGroup}>
                  <label style={commonStyles.label}>Organization *</label>
                  <select
                    name="organization"
                    value={formData.organization}
                    onChange={handleInputChange}
                    required
                    style={commonStyles.input}
                  >
                    <option value="">Select Organization for Facility</option>
                    {organizations.map((org) => (
                      <option key={org._id} value={org._id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Building Name *</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Tower A"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  style={commonStyles.input}
                />
              </div>

              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Building Code *</label>
                <input
                  type="text"
                  name="code"
                  placeholder="e.g. BLD-A"
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                  style={commonStyles.input}
                />
              </div>

              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Address</label>
                <input
                  type="text"
                  name="address"
                  placeholder="e.g. Plot 42, North Wing"
                  value={formData.address}
                  onChange={handleInputChange}
                  style={commonStyles.input}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={commonStyles.formGroup}>
                  <label style={commonStyles.label}>Number of Floors</label>
                  <input
                    type="number"
                    name="numberOfFloors"
                    min="1"
                    value={formData.numberOfFloors}
                    onChange={handleInputChange}
                    style={commonStyles.input}
                  />
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
                  </select>
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
                  {submitting ? "Saving..." : editingBuilding ? "Update Building" : "Create Building"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
