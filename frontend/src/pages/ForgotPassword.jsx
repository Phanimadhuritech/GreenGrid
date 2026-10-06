import React, { useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setDevResetUrl(null);

    if (!email.trim()) {
      setErrorMsg("Please enter your email address");
      return;
    }

    try {
      setLoading(true);
      const res = await API.post("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });

      setSubmitted(true);
      if (res.data.devResetUrl) {
        setDevResetUrl(res.data.devResetUrl);
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
        "An error occurred while sending the password reset request. Please try again."
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
          <h1 style={styles.title}>Forgot your password?</h1>
          <p style={styles.subtitle}>
            Enter the email associated with your GreenGrid account and we'll send you a password reset link.
          </p>
        </div>

        {errorMsg && (
          <div style={styles.errorAlert}>
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {submitted ? (
          <div style={styles.successContainer}>
            <div style={styles.successBadge}>
              <span style={styles.checkIcon}>✅</span>
              <div>
                <h4 style={styles.successTitle}>Check your inbox</h4>
                <p style={styles.successText}>
                  If an account exists for <strong>{email}</strong>, a password reset link has been sent. The link expires in 1 hour.
                </p>
              </div>
            </div>

            {devResetUrl && (
              <div style={styles.devBox}>
                <span style={styles.devTag}>🛠️ Development Mode Helper</span>
                <p style={styles.devText}>
                  SMTP simulation is active. You can directly access the reset link below:
                </p>
                <Link
                  to={devResetUrl.replace(/^https?:\/\/[^/]+/, "")}
                  style={styles.devLink}
                >
                  Open Password Reset Page ➔
                </Link>
              </div>
            )}

            <Link to="/login" style={styles.backToLoginBtn}>
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label} htmlFor="forgot-email">
                Email Address
              </label>
              <input
                id="forgot-email"
                type="email"
                placeholder="name@greengrid.test"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.input}
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={styles.submitBtn}
              id="forgot-submit-btn"
            >
              {loading ? "Sending link..." : "Send Reset Link ➔"}
            </button>
          </form>
        )}

        <div style={styles.footerRow}>
          <span>Remember your password?</span>{" "}
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
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#17221B",
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
  successContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  successBadge: {
    backgroundColor: "#DCFCE7",
    border: "1px solid #86EFAC",
    borderRadius: "10px",
    padding: "16px",
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
  },
  checkIcon: {
    fontSize: "20px",
  },
  successTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#166534",
    margin: "0 0 4px 0",
  },
  successText: {
    fontSize: "13px",
    color: "#334155",
    lineHeight: "1.4",
    margin: 0,
  },
  devBox: {
    backgroundColor: "#F8FAF9",
    border: "1px dashed #0F766E",
    borderRadius: "8px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  devTag: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#0F766E",
    textTransform: "uppercase",
  },
  devText: {
    fontSize: "12px",
    color: "#475569",
    margin: 0,
  },
  devLink: {
    color: "#166534",
    fontWeight: "700",
    fontSize: "13px",
    textDecoration: "underline",
  },
  backToLoginBtn: {
    backgroundColor: "#166534",
    color: "#FFFFFF",
    textAlign: "center",
    textDecoration: "none",
    padding: "11px",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "14px",
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
