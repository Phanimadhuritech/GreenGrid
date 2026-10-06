import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      setLoading(true);
      await login(email.trim().toLowerCase(), password);
      navigate("/dashboard");
    } catch (error) {
      setErrorMsg(
        error.response?.data?.message ||
        "Invalid email or password. Please verify your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        {/* Left Side: Brand & Overview */}
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
              Enterprise Utility & Energy Management
            </h2>
            <p style={styles.brandDescription}>
              Access real-time smart meter telemetry, progressive tiered billing calculations,
              and facility operations across your organization.
            </p>

            <div style={styles.statsPreviewBox}>
              <div style={styles.statMini}>
                <span style={styles.statMiniLabel}>System Status</span>
                <span style={styles.statMiniVal}>⚡ All Grids Normal</span>
              </div>
              <div style={styles.statMini}>
                <span style={styles.statMiniLabel}>Authentication</span>
                <span style={styles.statMiniVal}>🔒 JWT HTTP-Only</span>
              </div>
            </div>
          </div>

          <div style={styles.brandFooter}>
            <span>🌿 GreenGrid Smart Infrastructure SaaS</span>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div style={styles.formSide}>
          <div style={styles.formCard}>
            <div style={styles.formHeader}>
              <h1 style={styles.title}>Welcome Back</h1>
              <p style={styles.subtitle}>
                Sign in to your GreenGrid workspace
              </p>
            </div>

            {errorMsg && (
              <div style={styles.errorAlert}>
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="login-email-input">
                  Email Address
                </label>
                <input
                  id="login-email-input"
                  type="email"
                  placeholder="name@greengrid.test"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={styles.input}
                  autoComplete="email"
                />
              </div>

              <div style={styles.formGroup}>
                <div style={styles.labelRow}>
                  <label style={styles.label} htmlFor="login-password-input">
                    Password
                  </label>
                  <Link to="/forgot-password" style={styles.forgotLink}>
                    Forgot Password?
                  </Link>
                </div>
                <div style={styles.passwordInputWrapper}>
                  <input
                    id="login-password-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={styles.input}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggle}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={styles.button}
                id="login-submit-btn"
              >
                {loading ? "Signing in..." : "Sign In to GreenGrid ➔"}
              </button>
            </form>

            <div style={styles.registerRow}>
              <span>Don't have an account?</span>{" "}
              <Link to="/register" style={styles.registerLink}>
                Create Account
              </Link>
            </div>

            <div style={styles.footerNote}>
              <div style={styles.securityBadge}>
                🔒 Protected by HTTP-Only JWT & Centralized RBAC
              </div>
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
    gridTemplateColumns: "1fr 1.1fr",
    maxWidth: "960px",
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
  statsPreviewBox: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "12px",
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "16px",
  },
  statMini: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "13px",
  },
  statMiniLabel: {
    color: "#94A3B8",
  },
  statMiniVal: {
    fontWeight: "600",
    color: "#86EFAC",
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
    maxWidth: "400px",
  },
  formHeader: {
    marginBottom: "28px",
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
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
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
  forgotLink: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#0F766E",
    textDecoration: "none",
  },
  passwordInputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  input: {
    width: "100%",
    padding: "11px 14px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #DCE5DF",
    borderRadius: "8px",
    color: "#17221B",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s ease",
  },
  passwordToggle: {
    position: "absolute",
    right: "12px",
    background: "transparent",
    border: "none",
    color: "#64748B",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  button: {
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
  registerRow: {
    marginTop: "20px",
    paddingTop: "16px",
    borderTop: "1px solid #EBF1ED",
    textAlign: "center",
    fontSize: "13.5px",
    color: "#64748B",
  },
  registerLink: {
    color: "#166534",
    fontWeight: "700",
    textDecoration: "none",
  },
  footerNote: {
    marginTop: "20px",
    textAlign: "center",
  },
  securityBadge: {
    fontSize: "11.5px",
    color: "#94A3B8",
    fontWeight: "500",
  },
};