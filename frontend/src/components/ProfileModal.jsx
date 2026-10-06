import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";

export default function ProfileModal({ isOpen, onClose }) {
  const { user, getCurrentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
      });
      setIsEditing(false);
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const formatRole = (role) => {
    switch (role) {
      case "PLATFORM_ADMIN":
        return "Platform Admin";
      case "FACILITY_MANAGER":
        return "Facility Manager";
      case "FINANCE_OFFICER":
        return "Finance Officer";
      case "TECHNICIAN":
        return "Technician";
      case "UNIT_USER":
        return "Owner / Resident";
      default:
        return role || "User";
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!formData.name.trim()) {
      setErrorMsg("Full Name cannot be empty.");
      return;
    }

    try {
      setSaving(true);
      await API.put("/auth/profile", {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
      });

      await getCurrentUser();
      setSuccessMsg("Profile details updated successfully!");
      setIsEditing(false);
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || "Failed to update profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={styles.header}>
          <div style={styles.headerTitleGroup}>
            <span style={styles.headerIcon}>👤</span>
            <div>
              <h2 style={styles.headerTitle}>My Profile</h2>
              <p style={styles.headerSub}>View and manage your account credentials</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div style={styles.errorAlert}>
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div style={styles.successAlert}>
            <span>✅</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Avatar & Role Banner */}
        <div style={styles.avatarCard}>
          <div style={styles.avatarCircle}>
            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div style={styles.avatarMeta}>
            <h3 style={styles.userName}>{user.name || "GreenGrid User"}</h3>
            <div style={styles.roleBadgeRow}>
              <span style={styles.roleBadge}>{formatRole(user.role)}</span>
              <span style={styles.statusBadge}>
                <span style={styles.statusDot}></span>
                {user.status || "ACTIVE"}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Info Details / Edit Form */}
        {isEditing ? (
          <form onSubmit={handleSave} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label} htmlFor="prof-name">
                Full Name
              </label>
              <input
                id="prof-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label} htmlFor="prof-email">
                Email Address (Read-only)
              </label>
              <input
                id="prof-email"
                type="email"
                value={user.email}
                disabled
                style={{ ...styles.input, backgroundColor: "#F1F5F9", color: "#64748B", cursor: "not-allowed" }}
              />
              <span style={styles.hint}>Email address cannot be modified casually for security reasons.</span>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label} htmlFor="prof-phone">
                Phone Number
              </label>
              <input
                id="prof-phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={styles.input}
              />
            </div>

            <div style={styles.buttonRow}>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({ name: user.name || "", phone: user.phone || "" });
                  setErrorMsg("");
                }}
                disabled={saving}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} style={styles.saveBtn}>
                {saving ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        ) : (
          <div style={styles.detailsContainer}>
            <div style={styles.infoGrid}>
              <div style={styles.infoBox}>
                <span style={styles.infoLabel}>Email Address</span>
                <span style={styles.infoValue}>{user.email || "—"}</span>
              </div>

              <div style={styles.infoBox}>
                <span style={styles.infoLabel}>Phone Number</span>
                <span style={styles.infoValue}>{user.phone || "Not provided"}</span>
              </div>

              <div style={styles.infoBox}>
                <span style={styles.infoLabel}>Assigned Role</span>
                <span style={styles.infoValue}>{formatRole(user.role)}</span>
              </div>

              <div style={styles.infoBox}>
                <span style={styles.infoLabel}>Organization Scope</span>
                <span style={styles.infoValue}>
                  {user.organization?.name
                    ? `${user.organization.name} (${user.organization.code || "ORG"})`
                    : user.role === "PLATFORM_ADMIN"
                    ? "Global Platform Administrator"
                    : "Standard Workspace"}
                </span>
              </div>

              {user.unit && (
                <div style={styles.infoBox}>
                  <span style={styles.infoLabel}>Assigned Unit</span>
                  <span style={styles.infoValue}>
                    {user.unit.unitNumber ? `Unit ${user.unit.unitNumber}` : String(user.unit)}
                  </span>
                </div>
              )}

              <div style={styles.infoBox}>
                <span style={styles.infoLabel}>User ID</span>
                <span style={styles.infoValueMono}>{user._id || "—"}</span>
              </div>

              <div style={styles.infoBox}>
                <span style={styles.infoLabel}>Member Since</span>
                <span style={styles.infoValue}>
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                </span>
              </div>

              <div style={styles.infoBox}>
                <span style={styles.infoLabel}>Last Profile Update</span>
                <span style={styles.infoValue}>
                  {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                </span>
              </div>
            </div>

            <div style={styles.buttonRow}>
              <button onClick={() => setIsEditing(true)} style={styles.editBtn}>
                ✏️ Edit Profile Details
              </button>
              <button onClick={onClose} style={styles.closeActionBtn}>
                Close
              </button>
            </div>
          </div>
        )}

        <div style={styles.footerNote}>
          🔒 End-to-end encrypted session with HTTP-only cookies
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 61, 46, 0.45)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
    padding: "20px",
    boxSizing: "border-box",
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: "16px",
    border: "1px solid #DCE5DF",
    maxWidth: "540px",
    width: "100%",
    maxHeight: "92vh",
    overflowY: "auto",
    boxShadow: "0 20px 40px -10px rgba(15, 61, 46, 0.25)",
    padding: "28px",
    boxSizing: "border-box",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "1px solid #EBF1ED",
    paddingBottom: "16px",
    marginBottom: "20px",
  },
  headerTitleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  headerIcon: {
    fontSize: "24px",
    backgroundColor: "#F0FDF4",
    padding: "8px",
    borderRadius: "10px",
    border: "1px solid #DCFCE7",
  },
  headerTitle: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#17221B",
    margin: 0,
    letterSpacing: "-0.02em",
  },
  headerSub: {
    fontSize: "12.5px",
    color: "#64748B",
    margin: "2px 0 0 0",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: "18px",
    color: "#64748B",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "6px",
  },
  errorAlert: {
    backgroundColor: "#FEF2F2",
    border: "1px solid #FECACA",
    color: "#991B1B",
    padding: "10px 14px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  successAlert: {
    backgroundColor: "#DCFCE7",
    border: "1px solid #86EFAC",
    color: "#166534",
    padding: "10px 14px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  avatarCard: {
    backgroundColor: "#F8FAF9",
    border: "1px solid #DCE5DF",
    borderRadius: "12px",
    padding: "18px 20px",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    marginBottom: "20px",
  },
  avatarCircle: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    backgroundColor: "#166534",
    color: "#FFFFFF",
    fontSize: "22px",
    fontWeight: "800",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(22, 101, 52, 0.3)",
  },
  avatarMeta: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  userName: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#17221B",
    margin: 0,
  },
  roleBadgeRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  roleBadge: {
    fontSize: "11px",
    fontWeight: "700",
    backgroundColor: "#DCFCE7",
    color: "#166534",
    padding: "3px 8px",
    borderRadius: "9999px",
  },
  statusBadge: {
    fontSize: "11px",
    fontWeight: "700",
    backgroundColor: "#E0F2FE",
    color: "#0369A1",
    padding: "3px 8px",
    borderRadius: "9999px",
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
  },
  statusDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "#0284C7",
  },
  detailsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
  },
  infoBox: {
    backgroundColor: "#F8FAF9",
    border: "1px solid #EBF1ED",
    borderRadius: "8px",
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  infoLabel: {
    fontSize: "11.5px",
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  infoValue: {
    fontSize: "13.5px",
    fontWeight: "600",
    color: "#17221B",
    wordBreak: "break-word",
  },
  infoValueMono: {
    fontSize: "12px",
    fontFamily: "monospace",
    color: "#475569",
    wordBreak: "break-all",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#17221B",
  },
  hint: {
    fontSize: "11px",
    color: "#94A3B8",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #DCE5DF",
    borderRadius: "8px",
    color: "#17221B",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  },
  buttonRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "8px",
  },
  editBtn: {
    backgroundColor: "#166534",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    padding: "10px 18px",
    fontSize: "13.5px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  closeActionBtn: {
    backgroundColor: "#FFFFFF",
    color: "#475569",
    border: "1px solid #DCE5DF",
    borderRadius: "8px",
    padding: "10px 18px",
    fontSize: "13.5px",
    fontWeight: "600",
    cursor: "pointer",
  },
  cancelBtn: {
    backgroundColor: "#FFFFFF",
    color: "#475569",
    border: "1px solid #DCE5DF",
    borderRadius: "8px",
    padding: "10px 18px",
    fontSize: "13.5px",
    fontWeight: "600",
    cursor: "pointer",
  },
  saveBtn: {
    backgroundColor: "#166534",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    padding: "10px 20px",
    fontSize: "13.5px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(22, 101, 52, 0.3)",
  },
  footerNote: {
    marginTop: "20px",
    paddingTop: "14px",
    borderTop: "1px solid #EBF1ED",
    textAlign: "center",
    fontSize: "11px",
    color: "#94A3B8",
  },
};
