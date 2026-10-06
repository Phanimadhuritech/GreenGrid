import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";

const ROLE_OPTIONS = [
  { value: "UNIT_USER", label: "Owner / Resident (UNIT_USER)" },
  { value: "FACILITY_MANAGER", label: "Facility Manager (FACILITY_MANAGER)" },
  { value: "FINANCE_OFFICER", label: "Finance Officer (FINANCE_OFFICER)" },
  { value: "TECHNICIAN", label: "Technician (TECHNICIAN)" },
  { value: "PLATFORM_ADMIN", label: "Platform Admin (PLATFORM_ADMIN)" },
];

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "UNIT_USER",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setErrorMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // Front-end validations
    if (!formData.name.trim()) {
      setErrorMsg("Full Name is required");
      return;
    }
    if (!formData.email.trim()) {
      setErrorMsg("Email Address is required");
      return;
    }
    if (formData.password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const res = await API.post("/auth/register", {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
      });

      setSuccessMsg("Account created successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
        "Registration failed. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        {/* Left Side: Brand & Benefits */}
        <div style={styles.brandingSide}>
          <Link to="/" style={styles.brandLink}>
            <div style={styles.brandIcon}>⚡</div>
            <div style={styles.brandText}>
              <span style={styles.brandTitle}>GreenGrid</span>
              <span style={styles.brandSub}>Energy Cloud</span>
            </div>
          </Link>

          <div style={styles.brandHero}>
            <h2 style={styles.brandHeadline}>
              Smart Energy & Facility Operations
            </h2>
            <p style={styles.brandDescription}>
              Join a unified platform that connects smart sub-metering, progressive utility billing,
              and real-time maintenance management.
            </p>

            <div style={styles.benefitList}>
              <div style={styles.benefitItem}>
                <span style={styles.benefitCheck}>✓</span>
                <span>Automated progressive tiered billing (0-100, 101-200, 201+ kWh)</span>
              </div>
              <div style={styles.benefitItem}>
                <span style={styles.benefitCheck}>✓</span>
                <span>Role-scoped workspaces for Admins, Managers, Finance & Residents</span>
              </div>
              <div style={styles.benefitItem}>
                <span style={styles.benefitCheck}>✓</span>
                <span>End-to-end maintenance ticketing and technician triage</span>
              </div>
              <div style={styles.benefitItem}>
                <span style={styles.benefitCheck}>✓</span>
                <span>Secure authentication with HTTP-only cookies & audit logs</span>
              </div>
            </div>
          </div>

          <div style={styles.brandFooter}>
            <span>🔒 Enterprise Grade Data Isolation</span>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div style={styles.formSide}>
          <div style={styles.formCard}>
            <div style={styles.formHeader}>
              <h1 style={styles.title}>Create your Account</h1>
              <p style={styles.subtitle}>
                Get started with your GreenGrid organization or resident access
              </p>
            </div>

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

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="reg-name">
                  Full Name
                </label>
                <input
                  id="reg-name"
                  type="text"
                  name="name"
                  placeholder="e.g. Alex Morgan"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  style={styles.input}
                  autoComplete="name"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="reg-email">
                  Email Address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  name="email"
                  placeholder="alex@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  style={styles.input}
                  autoComplete="email"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="reg-role">
                  Account Role
                </label>
                <select
                  id="reg-role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  style={styles.select}
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span style={styles.inputHint}>
                  Select your assigned role within the facility or organization.
                </span>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <div style={styles.labelRow}>
                    <label style={styles.label} htmlFor="reg-password">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={styles.toggleBtn}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    style={styles.input}
                    autoComplete="new-password"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="reg-confirm-password">
                    Confirm Password
                  </label>
                  <input
                    id="reg-confirm-password"
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Repeat password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    style={styles.input}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || Boolean(successMsg)}
                style={styles.submitBtn}
                id="register-submit-btn"
              >
                {loading ? "Creating Account..." : "Create GreenGrid Account ➔"}
              </button>
            </form>

            <div style={styles.footerRow}>
              <span>Already have an account?</span>{" "}
              <Link to="/login" style={styles.signinLink}>
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F7F5",
    padding: "32px 20px",
    boxSizing: "border-box",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  wrapper: {
    display: "grid",
    gridTemplateColumns: "1fr 1.15fr",
    maxWidth: "1080px",
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: "18px",
    border: "1px solid #DCE5DF",
    boxShadow: "0 20px 40px -15px rgba(15, 61, 46, 0.12)",
    overflow: "hidden",
  },
  brandingSide: {
    backgroundColor: "#0F3D2E",
    color: "#FFFFFF",
    padding: "48px 40px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    backgroundImage: "radial-gradient(circle at 100% 0%, rgba(22, 163, 74, 0.25) 0%, rgba(15, 61, 46, 0) 60%)",
  },
  brandLink: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    textDecoration: "none",
  },
  brandIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    backgroundColor: "#16A34A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#FFFFFF",
    fontSize: "20px",
    boxShadow: "0 2px 8px rgba(22, 163, 74, 0.4)",
  },
  brandText: {
    display: "flex",
    flexDirection: "column",
  },
  brandTitle: {
    fontSize: "19px",
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: "-0.02em",
  },
  brandSub: {
    fontSize: "10px",
    fontWeight: "700",
    color: "#86EFAC",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  brandHero: {
    margin: "40px 0",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  brandHeadline: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: "1.25",
    letterSpacing: "-0.02em",
    margin: 0,
  },
  brandDescription: {
    fontSize: "14px",
    color: "#CBD5E1",
    lineHeight: "1.6",
    margin: 0,
  },
  benefitList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "12px",
  },
  benefitItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    fontSize: "13.5px",
    color: "#E2E8F0",
  },
  benefitCheck: {
    color: "#4ADE80",
    fontWeight: "bold",
  },
  brandFooter: {
    fontSize: "12px",
    color: "#94A3B8",
    paddingTop: "20px",
    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
  },

  // Form Side
  formSide: {
    padding: "48px 44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  formCard: {
    width: "100%",
    maxWidth: "460px",
  },
  formHeader: {
    marginBottom: "24px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#17221B",
    margin: "0 0 6px 0",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: "14px",
    color: "#64748B",
    margin: 0,
  },
  errorAlert: {
    backgroundColor: "#FEF2F2",
    border: "1px solid #FECACA",
    color: "#991B1B",
    padding: "10px 14px",
    borderRadius: "8px",
    marginBottom: "18px",
    fontSize: "13.5px",
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
    marginBottom: "18px",
    fontSize: "13.5px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    flex: 1,
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  labelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#17221B",
  },
  toggleBtn: {
    background: "transparent",
    border: "none",
    color: "#0F766E",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    padding: 0,
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
    transition: "border-color 0.15s ease",
  },
  select: {
    width: "100%",
    padding: "10px 14px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #DCE5DF",
    borderRadius: "8px",
    color: "#17221B",
    fontSize: "13.5px",
    outline: "none",
    boxSizing: "border-box",
    cursor: "pointer",
  },
  inputHint: {
    fontSize: "11px",
    color: "#64748B",
  },
  submitBtn: {
    backgroundColor: "#166534",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    fontSize: "14.5px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(22, 101, 52, 0.3)",
    marginTop: "6px",
    transition: "all 0.15s ease",
  },
  footerRow: {
    marginTop: "20px",
    paddingTop: "16px",
    borderTop: "1px solid #EBF1ED",
    textAlign: "center",
    fontSize: "13.5px",
    color: "#64748B",
  },
  signinLink: {
    color: "#166534",
    fontWeight: "700",
    textDecoration: "none",
  },
};
