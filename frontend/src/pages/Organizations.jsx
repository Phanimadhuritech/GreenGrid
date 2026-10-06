import React, { useState, useEffect } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import { commonStyles } from "../theme";

export default function Organizations() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contactEmail: "",
    contactPhone: "",
    status: "ACTIVE",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await API.get("/organizations");
      setOrganizations(response.data.organizations || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      if (user.role === "PLATFORM_ADMIN") {
        fetchOrganizations();
      } else {
        setLoading(false);
      }
    }
  }, [user]);

  const openCreateModal = () => {
    setEditingOrg(null);
    setFormData({
      name: "",
      address: "",
      contactEmail: "",
      contactPhone: "",
      status: "ACTIVE",
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (org) => {
    setEditingOrg(org);
    setFormData({
      name: org.name || "",
      address: org.address || "",
      contactEmail: org.contactEmail || "",
      contactPhone: org.contactPhone || "",
      status: org.status || "ACTIVE",
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingOrg(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Organization name is required");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      if (editingOrg) {
        const res = await API.put(`/organizations/${editingOrg._id}`, formData);
        setSuccess(`Organization "${res.data.organization.name}" updated successfully.`);
      } else {
        const res = await API.post("/organizations", formData);
        setSuccess(`Organization "${res.data.organization.name}" created successfully.`);
      }

      closeModal();
      fetchOrganizations();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save organization");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete organization "${name}"?`)) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      await API.delete(`/organizations/${id}`);
      setSuccess(`Organization "${name}" deleted successfully.`);
      fetchOrganizations();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete organization");
    }
  };

  const filteredOrgs = organizations.filter((org) => {
    if (statusFilter !== "ALL" && org.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = org.name?.toLowerCase().includes(q);
      const matchEmail = org.contactEmail?.toLowerCase().includes(q);
      const matchPhone = org.contactPhone?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone) return false;
    }
    return true;
  });

  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter((o) => o.status === "ACTIVE").length;

  if (user && user.role !== "PLATFORM_ADMIN") {
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
            Multi-tenant organization governance is restricted to Platform Administrators.
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
          <h1 style={commonStyles.pageTitle}>Tenant Organizations</h1>
          <p style={commonStyles.pageSubtitle}>
            Global administrative governance of corporate entities, properties, and facility clients.
          </p>
        </div>
        <div style={commonStyles.headerActions}>
          <button onClick={openCreateModal} style={commonStyles.primaryBtn}>
            <span>+</span>
            <span>Add Organization</span>
          </button>
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
          <div style={commonStyles.statLabel}>Total Organizations</div>
          <div style={commonStyles.statValue}>{totalOrgs}</div>
          <div style={commonStyles.statSubtext}>Managed entities</div>
        </div>

        <div style={commonStyles.statCard}>
          <div style={commonStyles.statLabel}>Active Tenants</div>
          <div style={{ ...commonStyles.statValue, color: "#166534" }}>{activeOrgs}</div>
          <div style={commonStyles.statSubtext}>Active subscription status</div>
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
            placeholder="🔍 Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={commonStyles.input}
          />
        </div>

        <div style={{ width: "160px" }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ ...commonStyles.input, cursor: "pointer" }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
      </div>

      {/* Main Table View */}
      <div style={commonStyles.tableContainer}>
        {loading ? (
          <div style={commonStyles.loadingSpinner}>
            <span>🌿</span> Loading organizations...
          </div>
        ) : filteredOrgs.length === 0 ? (
          <div style={commonStyles.emptyState}>
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>🏢</div>
            <h3 style={{ margin: "0 0 6px 0", color: "#17221B" }}>No Organizations Found</h3>
            <p style={{ margin: 0 }}>
              {search || statusFilter !== "ALL"
                ? "No organizations match the selected filters."
                : "No organizations created yet."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={commonStyles.table}>
              <thead>
                <tr>
                  <th style={commonStyles.th}>Organization Name</th>
                  <th style={commonStyles.th}>Contact Email</th>
                  <th style={commonStyles.th}>Phone</th>
                  <th style={commonStyles.th}>Address</th>
                  <th style={commonStyles.th}>Status</th>
                  <th style={{ ...commonStyles.th, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.map((org) => (
                  <tr key={org._id} style={commonStyles.trHover}>
                    <td style={{ ...commonStyles.td, fontWeight: "700", color: "#166534" }}>
                      🏢 {org.name}
                    </td>
                    <td style={commonStyles.td}>
                      {org.contactEmail || "—"}
                    </td>
                    <td style={{ ...commonStyles.td, color: "#64748B" }}>
                      {org.contactPhone || "—"}
                    </td>
                    <td style={{ ...commonStyles.td, color: "#64748B", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {org.address || "—"}
                    </td>
                    <td style={commonStyles.td}>
                      {org.status === "ACTIVE" ? (
                        <span style={commonStyles.badgeActive}>✓ ACTIVE</span>
                      ) : (
                        <span style={commonStyles.badgeNeutral}>{org.status || "INACTIVE"}</span>
                      )}
                    </td>
                    <td style={{ ...commonStyles.td, textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => openEditModal(org)}
                          style={{
                            ...commonStyles.outlineBtn,
                            padding: "6px 12px",
                            fontSize: "12.5px",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(org._id, org.name)}
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
                {editingOrg ? "Edit Organization" : "Create New Organization"}
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
                <label style={commonStyles.label}>Organization Name *</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Green Valley Facility Management"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  style={commonStyles.input}
                />
              </div>

              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Contact Email</label>
                <input
                  type="email"
                  name="contactEmail"
                  placeholder="contact@greenvalley.com"
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                  style={commonStyles.input}
                />
              </div>

              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Contact Phone</label>
                <input
                  type="tel"
                  name="contactPhone"
                  placeholder="+91 98765 43210"
                  value={formData.contactPhone}
                  onChange={handleInputChange}
                  style={commonStyles.input}
                />
              </div>

              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Corporate Address</label>
                <input
                  type="text"
                  name="address"
                  placeholder="e.g. Cyber City Tech Boulevard"
                  value={formData.address}
                  onChange={handleInputChange}
                  style={commonStyles.input}
                />
              </div>

              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  style={commonStyles.input}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
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
                  {submitting ? "Saving..." : editingOrg ? "Update Organization" : "Create Organization"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
