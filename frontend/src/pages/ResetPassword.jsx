import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import API from "../services/api";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!password) {
      setErrorMsg("Please enter a new password");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const res = await API.post(`/auth/reset-password/${token}`, {
        password,
        confirmPassword,
      });

      setSuccessMsg(res.data.message || "Password reset successful! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
        "Invalid or expired password reset link. Please request a new one."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <Link to="/" style={styles.brandLink}>
            <div style={styles.brandIcon}>⚡</div>
            <span style={styles.brandName}>GreenGrid</span>
          </Link>
          <h1 style={styles.title}>Reset Your Password</h1>
          <p style={styles.subtitle}>
            Enter your new secure password below to regain access to your account.
          </p>
        </div>

        {errorMsg && (
          <div style={styles.errorAlert}>
            <span>⚠️</span>
            <div>
              <span>{errorMsg}</span>
              {errorMsg.includes("expired") || errorMsg.includes("Invalid") ? (
                <div style={{ marginTop: "6px" }}>
                  <Link to="/forgot-password" style={styles.requestNewLink}>
                    Request a new reset link ➔
                  </Link>
                </div>
              ) : null}
            </div>
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
            <div style={styles.labelRow}>
              <label style={styles.label} htmlFor="new-password">
                New Password
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
              id="new-password"
              type={showPassword ? "text" : "password"}
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
              autoComplete="new-password"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="confirm-new-password">
              Confirm New Password
            </label>
            <input
              id="confirm-new-password"
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={styles.input}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || Boolean(successMsg)}
            style={styles.submitBtn}
            id="reset-submit-btn"
          >
            {loading ? "Updating Password..." : "Set New Password ➔"}
          </button>
        </form>

        <div style={styles.footerRow}>
          <span>Remembered your password?</span>{" "}
          <Link to="/login" style={styles.loginLink}>
            Sign In
          </Link>
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
    padding: "24px 16px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  card: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #DCE5DF",
    borderRadius: "16px",
    padding: "40px 36px",
    width: "100%",
    maxWidth: "440px",
    boxShadow: "0 10px 25px -5px rgba(15, 61, 46, 0.08)",
  },
  header: {
    textAlign: "center",
    marginBottom: "24px",
  },
  brandLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    textDecoration: "none",
    marginBottom: "20px",
  },
  brandIcon: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    backgroundColor: "#16A34A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#FFFFFF",
    fontSize: "18px",
  },
  brandName: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#166534",
    letterSpacing: "-0.02em",
  },
  title: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#17221B",
    margin: "0 0 8px 0",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: "13.5px",
    color: "#64748B",
    lineHeight: "1.5",
    margin: 0,
  },
  errorAlert: {
    backgroundColor: "#FEF2F2",
    border: "1px solid #FECACA",
    color: "#991B1B",
    padding: "10px 14px",
    borderRadius: "8px",
    marginBottom: "18px",
    fontSize: "13px",
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
  },
  successAlert: {
    backgroundColor: "#DCFCE7",
    border: "1px solid #86EFAC",
    color: "#166534",
    padding: "10px 14px",
    borderRadius: "8px",
    marginBottom: "18px",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  requestNewLink: {
    color: "#991B1B",
    fontWeight: "700",
    textDecoration: "underline",
    fontSize: "12px",
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
    padding: "11px 14px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #DCE5DF",
    borderRadius: "8px",
    color: "#17221B",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
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
    transition: "all 0.15s ease",
  },
  footerRow: {
    marginTop: "24px",
    paddingTop: "16px",
    borderTop: "1px solid #EBF1ED",
    textAlign: "center",
    fontSize: "13px",
    color: "#64748B",
  },
  loginLink: {
    color: "#166534",
    fontWeight: "700",
    textDecoration: "none",
  },
};
