import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (!user) return null;

  const isAdmin = user.role === "PLATFORM_ADMIN";
  const isManager = user.role === "FACILITY_MANAGER";
  const isResident = user.role === "UNIT_USER";
  const isTech = user.role === "TECHNICIAN";
  const isFinance = user.role === "FINANCE_OFFICER";
  const canManageInfrastructure = isAdmin || isManager;
  const canViewReports = isAdmin || isManager || isFinance;

  const isActive = (path) => {
    if (path === "/dashboard" && location.pathname === "/dashboard") return true;
    if (path !== "/dashboard" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case "PLATFORM_ADMIN": return "Admin";
      case "FACILITY_MANAGER": return "Manager";
      case "UNIT_USER": return "Resident";
      case "TECHNICIAN": return "Technician";
      case "FINANCE_OFFICER": return "Finance";
      default: return role || "Member";
    }
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.navContainer}>
        {/* Brand */}
        <div style={styles.navBrand}>
          <Link to="/" style={styles.brandLink} title="Go to GreenGrid Home">
            <div style={styles.brandIconWrapper}>
              <span style={styles.brandIcon}>🌿</span>
            </div>
            <div style={styles.brandTextWrapper}>
              <span style={styles.brandName}>GreenGrid</span>
              <span style={styles.brandTag}>Energy Cloud</span>
            </div>
          </Link>
        </div>

        {/* Links */}
        <div style={styles.navLinks}>
          <Link
            to="/dashboard"
            style={{
              ...styles.navLink,
              ...(isActive("/dashboard") ? styles.activeNavLink : {}),
            }}
          >
            Dashboard
          </Link>

          {isAdmin && (
            <Link
              to="/organizations"
              style={{
                ...styles.navLink,
                ...(isActive("/organizations") ? styles.activeNavLink : {}),
              }}
            >
              Organizations
            </Link>
          )}

          {canManageInfrastructure && (
            <>
              <Link
                to="/buildings"
                style={{
                  ...styles.navLink,
                  ...(isActive("/buildings") ? styles.activeNavLink : {}),
                }}
              >
                Buildings
              </Link>
              <Link
                to="/units"
                style={{
                  ...styles.navLink,
                  ...(isActive("/units") ? styles.activeNavLink : {}),
                }}
              >
                Units
              </Link>
              <Link
                to="/meters"
                style={{
                  ...styles.navLink,
                  ...(isActive("/meters") ? styles.activeNavLink : {}),
                }}
              >
                Meters
              </Link>
              <Link
                to="/readings"
                style={{
                  ...styles.navLink,
                  ...(isActive("/readings") ? styles.activeNavLink : {}),
                }}
              >
                Readings
              </Link>
            </>
          )}

          {isResident && (
            <Link
              to="/consumption"
              style={{
                ...styles.navLink,
                ...(isActive("/consumption") ? styles.activeNavLink : {}),
              }}
            >
              Consumption
            </Link>
          )}

          {/* Billing & Invoices */}
          {!isTech && (
            <>
              <Link
                to="/invoices"
                style={{
                  ...styles.navLink,
                  ...(isActive("/invoices") ? styles.activeNavLink : {}),
                }}
              >
                Invoices
              </Link>
              <Link
                to="/payments"
                style={{
                  ...styles.navLink,
                  ...(isActive("/payments") ? styles.activeNavLink : {}),
                }}
              >
                Payments
              </Link>
            </>
          )}

          {(isAdmin || isFinance) && (
            <>
              <Link
                to="/tariffs"
                style={{
                  ...styles.navLink,
                  ...(isActive("/tariffs") ? styles.activeNavLink : {}),
                }}
              >
                Tariffs
              </Link>
              <Link
                to="/billing-calculator"
                style={{
                  ...styles.navLink,
                  ...(isActive("/billing-calculator") ? styles.activeNavLink : {}),
                }}
              >
                Calculator
              </Link>
            </>
          )}

          {/* Maintenance */}
          {!isFinance && (
            <Link
              to="/maintenance"
              style={{
                ...styles.navLink,
                ...(isActive("/maintenance") ? styles.activeNavLink : {}),
              }}
            >
              Maintenance
            </Link>
          )}

          {/* Reports */}
          {canViewReports && (
            <Link
              to="/reports"
              style={{
                ...styles.navLink,
                ...(isActive("/reports") ? styles.activeNavLink : {}),
              }}
            >
              Reports
            </Link>
          )}
        </div>

        {/* User Info & Actions */}
        <div style={styles.navActions}>
          <div style={styles.userBadge}>
            <span style={styles.roleBadge}>{getRoleLabel(user.role)}</span>
            <span style={styles.userName}>{user.name || user.email}</span>
          </div>

          <button onClick={handleLogout} style={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    backgroundColor: "#0F3D2E",
    borderBottom: "1px solid #14532D",
    position: "sticky",
    top: 0,
    zIndex: 1000,
    boxShadow: "0 2px 8px rgba(15, 61, 46, 0.2)",
  },
  navContainer: {
    maxWidth: "1440px",
    margin: "0 auto",
    padding: "0 24px",
    height: "64px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
  },
  navBrand: {
    display: "flex",
    alignItems: "center",
  },
  brandLink: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    textDecoration: "none",
  },
  brandIconWrapper: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    backgroundColor: "#16A34A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 6px rgba(22, 163, 74, 0.4)",
  },
  brandIcon: {
    fontSize: "18px",
  },
  brandTextWrapper: {
    display: "flex",
    flexDirection: "column",
  },
  brandName: {
    fontSize: "17px",
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: "-0.02em",
    lineHeight: "1.1",
  },
  brandTag: {
    fontSize: "10px",
    fontWeight: "700",
    color: "#86EFAC",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    overflowX: "auto",
  },
  navLink: {
    color: "#E2E8F0",
    textDecoration: "none",
    fontSize: "13.5px",
    fontWeight: "500",
    padding: "8px 12px",
    borderRadius: "6px",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  },
  activeNavLink: {
    color: "#FFFFFF",
    backgroundColor: "#16A34A",
    fontWeight: "600",
    boxShadow: "0 2px 4px rgba(22, 163, 74, 0.3)",
  },
  navActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  userBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    padding: "4px 10px 4px 6px",
    borderRadius: "9999px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  roleBadge: {
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    padding: "2px 8px",
    borderRadius: "9999px",
    letterSpacing: "0.04em",
    backgroundColor: "#DCFCE7",
    color: "#166534",
  },
  userName: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#FFFFFF",
    maxWidth: "130px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  logoutBtn: {
    backgroundColor: "transparent",
    color: "#FCA5A5",
    border: "1px solid rgba(252, 165, 165, 0.3)",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
};

export default Navbar;
