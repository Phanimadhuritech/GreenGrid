import React, { useState, useEffect } from "react";
import API from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import AppLayout from "../../components/AppLayout";
import { commonStyles, theme } from "../../theme";

function Tariffs() {
  const { user } = useAuth();
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [editingTariff, setEditingTariff] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    slabs: [
      { from: 0, to: 100, rate: 3 },
      { from: 101, to: 200, rate: 5 },
      { from: 201, to: "", rate: 7 },
    ],
    fixedCharge: 100,
    taxPercentage: 18,
    adjustments: 0,
    effectiveFrom: new Date().toISOString().split("T")[0],
    effectiveTo: "",
    status: "ACTIVE",
  });
  const [submitting, setSubmitting] = useState(false);

  const isAuthorized = user?.role === "PLATFORM_ADMIN" || user?.role === "FACILITY_MANAGER";

  const fetchTariffs = async () => {
    if (!isAuthorized) return;
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/tariffs");
      setTariffs(res.data.tariffs || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load tariffs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      if (isAuthorized) {
        fetchTariffs();
      } else {
        setLoading(false);
      }
    }
  }, [user]);

  const openCreateModal = () => {
    setEditingTariff(null);
    setFormData({
      name: "",
      slabs: [
        { from: 0, to: 100, rate: 3 },
        { from: 101, to: 200, rate: 5 },
        { from: 201, to: "", rate: 7 },
      ],
      fixedCharge: 100,
      taxPercentage: 18,
      adjustments: 0,
      effectiveFrom: new Date().toISOString().split("T")[0],
      effectiveTo: "",
      status: "ACTIVE",
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (t) => {
    setEditingTariff(t);
    setFormData({
      name: t.name || "",
      slabs: (t.slabs || []).map((s) => ({
        from: s.from,
        to: s.to !== null && s.to !== undefined ? s.to : "",
        rate: s.rate,
      })),
      fixedCharge: t.fixedCharge !== undefined ? t.fixedCharge : 0,
      taxPercentage: t.taxPercentage !== undefined ? t.taxPercentage : 0,
      adjustments: t.adjustments !== undefined ? t.adjustments : 0,
      effectiveFrom: t.effectiveFrom
        ? new Date(t.effectiveFrom).toISOString().split("T")[0]
        : "",
      effectiveTo: t.effectiveTo
        ? new Date(t.effectiveTo).toISOString().split("T")[0]
        : "",
      status: t.status || "ACTIVE",
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTariff(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSlabChange = (index, field, value) => {
    const updatedSlabs = [...formData.slabs];
    updatedSlabs[index] = {
      ...updatedSlabs[index],
      [field]: field === "to" && value === "" ? "" : Number(value),
    };
    setFormData((prev) => ({ ...prev, slabs: updatedSlabs }));
  };

  const addSlab = () => {
    const lastSlab = formData.slabs[formData.slabs.length - 1];
    let nextFrom = 0;
    if (lastSlab) {
      nextFrom = lastSlab.to !== "" && lastSlab.to !== null ? Number(lastSlab.to) + 1 : Number(lastSlab.from) + 100;
      if (lastSlab.to === "" || lastSlab.to === null) {
        lastSlab.to = nextFrom - 1;
      }
    }
    setFormData((prev) => ({
      ...prev,
      slabs: [...prev.slabs, { from: nextFrom, to: "", rate: 5 }],
    }));
  };

  const removeSlab = (index) => {
    if (formData.slabs.length <= 1) {
      setError("Tariff must contain at least one slab");
      return;
    }
    const updatedSlabs = formData.slabs.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, slabs: updatedSlabs }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Tariff name is required");
      return;
    }

    if (!formData.effectiveFrom) {
      setError("Effective from date is required");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        name: formData.name.trim(),
        slabs: formData.slabs.map((s) => ({
          from: Number(s.from),
          to: s.to !== "" && s.to !== null && s.to !== undefined ? Number(s.to) : null,
          rate: Number(s.rate),
        })),
        fixedCharge: Number(formData.fixedCharge) || 0,
        taxPercentage: Number(formData.taxPercentage) || 0,
        adjustments: Number(formData.adjustments) || 0,
        effectiveFrom: formData.effectiveFrom,
        effectiveTo: formData.effectiveTo ? formData.effectiveTo : null,
        status: formData.status || "ACTIVE",
      };

      if (editingTariff) {
        await API.put(`/tariffs/${editingTariff._id}`, payload);
        setSuccess("Tariff updated successfully!");
      } else {
        await API.post("/tariffs", payload);
        setSuccess("Tariff created successfully!");
      }

      setShowModal(false);
      fetchTariffs();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save tariff");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete tariff "${name}"?`)) {
      return;
    }

    try {
      setError("");
      await API.delete(`/tariffs/${id}`);
      setSuccess("Tariff deleted successfully!");
      fetchTariffs();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete tariff");
    }
  };

  const isAdmin = user?.role === "PLATFORM_ADMIN";

  if (!isAuthorized) {
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
          <span style={{ fontSize: "40px" }}>🔒</span>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#17221B", margin: "14px 0 8px" }}>
            Access Restricted
          </h2>
          <p style={{ fontSize: "14px", color: "#64748B", margin: "0 0 20px" }}>
            Tariff management is restricted to Platform Administrators and Facility Managers.
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
      <div style={commonStyles.pageHeader}>
          <div style={commonStyles.titleGroup}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ ...commonStyles.badge, ...commonStyles.badgeTeal }}>Tariff Engine</span>
              <span style={{ fontSize: "12px", color: "#22C55E", fontWeight: "600" }}>● Progressive Slabs</span>
            </div>
            <h1 style={commonStyles.pageTitle}>Tariff Management</h1>
            <p style={commonStyles.pageSubtitle}>
              Configure progressive electricity billing rates, slabs, fixed charges, taxes, and validity periods.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={openCreateModal}
              style={commonStyles.primaryBtn}
              id="add-tariff-btn"
            >
              <span>+</span> Create Tariff
            </button>
          )}
        </div>

        {error && (
          <div style={commonStyles.errorAlert}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div style={commonStyles.successAlert}>
            <span>✓</span>
            <span>{success}</span>
          </div>
        )}

        {loading ? (
          <div style={commonStyles.loadingBox}>Loading tariffs...</div>
        ) : tariffs.length === 0 ? (
          <div style={commonStyles.emptyBox}>
            <p>No tariffs configured yet.</p>
            {isAdmin && (
              <button onClick={openCreateModal} style={commonStyles.secondaryBtn}>
                Create the first tariff
              </button>
            )}
          </div>
        ) : (
          <div style={commonStyles.tableCard}>
            <table style={commonStyles.table}>
              <thead>
                <tr style={commonStyles.tableHeaderRow}>
                  <th style={commonStyles.th}>Tariff Name</th>
                  <th style={commonStyles.th}>Slabs & Rates</th>
                  <th style={commonStyles.th}>Fixed Charge</th>
                  <th style={commonStyles.th}>Tax</th>
                  <th style={commonStyles.th}>Effective Period</th>
                  <th style={commonStyles.th}>Status</th>
                  {isAdmin && <th style={commonStyles.thCenter}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {tariffs.map((t) => (
                  <tr key={t._id} style={commonStyles.tableRow}>
                    <td style={commonStyles.tdBold}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ color: "#22C55E" }}>⚡</span>
                        <span>{t.name}</span>
                      </div>
                    </td>
                    <td style={commonStyles.td}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {t.slabs?.map((s, idx) => (
                          <span
                            key={idx}
                            style={{
                              ...commonStyles.badge,
                              ...commonStyles.badgeTeal,
                              fontFamily: "monospace",
                              fontSize: "11.5px",
                            }}
                          >
                            {s.from}–{s.to !== null ? s.to : "∞"}u: ₹{s.rate}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={commonStyles.tdBold}>
                      ₹{t.fixedCharge}
                    </td>
                    <td style={commonStyles.td}>
                      <span style={{ ...commonStyles.badge, ...commonStyles.badgeLime }}>
                        {t.taxPercentage}% Tax
                      </span>
                    </td>
                    <td style={commonStyles.td}>
                      <span style={{ fontSize: "13px", color: "#94A3B8" }}>
                        {new Date(t.effectiveFrom).toLocaleDateString()} &rarr;{" "}
                        {t.effectiveTo ? new Date(t.effectiveTo).toLocaleDateString() : "Present"}
                      </span>
                    </td>
                    <td style={commonStyles.td}>
                      <span
                        style={{
                          ...commonStyles.badge,
                          ...(t.status === "ACTIVE"
                            ? commonStyles.badgeActive
                            : commonStyles.badgeInactive),
                        }}
                      >
                        {t.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={commonStyles.tdCenter}>
                        <button
                          onClick={() => openEditModal(t)}
                          style={commonStyles.actionBtnEdit}
                          className="edit-tariff-btn"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(t._id, t.name)}
                          style={commonStyles.actionBtnDelete}
                          className="delete-tariff-btn"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* Create / Edit Tariff Modal */}
      {showModal && (
        <div style={commonStyles.modalOverlay}>
          <div style={{ ...commonStyles.modalContent, maxWidth: "620px" }}>
            <div style={commonStyles.modalHeader}>
              <div>
                <h2 style={commonStyles.modalTitle}>
                  {editingTariff ? "Edit Tariff" : "Create New Tariff"}
                </h2>
                <p style={{ fontSize: "13px", color: "#94A3B8", margin: "4px 0 0" }}>
                  Define progressive consumption slabs and billing parameters.
                </p>
              </div>
              <button onClick={closeModal} style={commonStyles.closeBtn}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={commonStyles.form}>
              <div style={commonStyles.formGroup}>
                <label style={commonStyles.label}>
                  Tariff Name <span style={{ color: "#F87171" }}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Residential Tariff 2026"
                  required
                  style={commonStyles.input}
                  id="tariff-name-input"
                />
              </div>

              {/* Dynamic Slabs Section */}
              <div style={{ ...commonStyles.formGroup, background: "#0B2119", padding: "14px", borderRadius: "8px", border: "1px solid #1F4033" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ ...commonStyles.label, color: "#F0FDF4", fontWeight: "700" }}>
                    Progressive Slabs <span style={{ color: "#F87171" }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={addSlab}
                    style={{ ...commonStyles.secondaryBtn, padding: "4px 10px", fontSize: "12px", background: "rgba(34, 197, 94, 0.15)", color: "#22C55E", border: "1px solid rgba(34, 197, 94, 0.3)" }}
                  >
                    + Add Slab
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {formData.slabs.map((slab, idx) => (
                    <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <div style={{ width: "24px", fontSize: "12px", fontWeight: "700", color: "#94A3B8", textAlign: "center" }}>
                        #{idx + 1}
                      </div>

                      <div style={{ flex: 1 }}>
                        <input
                          type="number"
                          placeholder="From"
                          value={slab.from}
                          onChange={(e) => handleSlabChange(idx, "from", e.target.value)}
                          min="0"
                          required
                          style={{ ...commonStyles.input, padding: "6px 10px", fontSize: "13px" }}
                        />
                      </div>

                      <span style={{ color: "#94A3B8" }}>&rarr;</span>

                      <div style={{ flex: 1 }}>
                        <input
                          type="number"
                          placeholder="To (Blank for &infin;)"
                          value={slab.to}
                          onChange={(e) => handleSlabChange(idx, "to", e.target.value)}
                          min={slab.from + 1}
                          style={{ ...commonStyles.input, padding: "6px 10px", fontSize: "13px" }}
                        />
                      </div>

                      <div style={{ flex: 1.2, display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ color: "#94A3B8", fontSize: "12px" }}>₹</span>
                        <input
                          type="number"
                          step="any"
                          placeholder="Rate/unit"
                          value={slab.rate}
                          onChange={(e) => handleSlabChange(idx, "rate", e.target.value)}
                          min="0"
                          required
                          style={{ ...commonStyles.input, padding: "6px 10px", fontSize: "13px" }}
                        />
                      </div>

                      {formData.slabs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSlab(idx)}
                          style={{ background: "none", border: "none", color: "#F87171", cursor: "pointer", fontSize: "16px", padding: "4px" }}
                          title="Remove slab"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={commonStyles.formRow}>
                <div style={commonStyles.formGroupHalf}>
                  <label style={commonStyles.label}>Fixed Charge (₹)</label>
                  <input
                    type="number"
                    step="any"
                    name="fixedCharge"
                    value={formData.fixedCharge}
                    onChange={handleInputChange}
                    min="0"
                    style={commonStyles.input}
                    id="tariff-fixed-charge-input"
                  />
                </div>

                <div style={commonStyles.formGroupHalf}>
                  <label style={commonStyles.label}>Tax Percentage (%)</label>
                  <input
                    type="number"
                    step="any"
                    name="taxPercentage"
                    value={formData.taxPercentage}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    style={commonStyles.input}
                    id="tariff-tax-input"
                  />
                </div>
              </div>

              <div style={commonStyles.formRow}>
                <div style={commonStyles.formGroupHalf}>
                  <label style={commonStyles.label}>
                    Effective From <span style={{ color: "#F87171" }}>*</span>
                  </label>
                  <input
                    type="date"
                    name="effectiveFrom"
                    value={formData.effectiveFrom}
                    onChange={handleInputChange}
                    required
                    style={commonStyles.input}
                    id="tariff-effective-from-input"
                  />
                </div>

                <div style={commonStyles.formGroupHalf}>
                  <label style={commonStyles.label}>Effective To (Optional)</label>
                  <input
                    type="date"
                    name="effectiveTo"
                    value={formData.effectiveTo}
                    onChange={handleInputChange}
                    style={commonStyles.input}
                    id="tariff-effective-to-input"
                  />
                </div>
              </div>

              <div style={commonStyles.formRow}>
                <div style={commonStyles.formGroupHalf}>
                  <label style={commonStyles.label}>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    style={commonStyles.select}
                    id="tariff-status-select"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                <div style={commonStyles.formGroupHalf}>
                  <label style={commonStyles.label}>Adjustments (₹)</label>
                  <input
                    type="number"
                    step="any"
                    name="adjustments"
                    value={formData.adjustments}
                    onChange={handleInputChange}
                    style={commonStyles.input}
                    id="tariff-adjustments-input"
                  />
                </div>
              </div>

              <div style={commonStyles.modalFooter}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={commonStyles.secondaryBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={commonStyles.primaryBtn}
                  id="tariff-save-btn"
                >
                  {submitting
                    ? "Saving..."
                    : editingTariff
                    ? "Update Tariff"
                    : "Create Tariff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default Tariffs;
