import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ isCollapsed, isMobileOpen, onClose }) {
  const location = useLocation();
  const { user: authUser } = useAuth();
  const currentPath = location.pathname;
  const role = authUser?.role;

  // Role-specific navigation items
  const getNavItems = () => {
    switch (role) {
      case "PLATFORM_ADMIN":
        return [
          { label: "Dashboard", path: "/dashboard", icon: "📊" },
          { label: "Organizations", path: "/organizations", icon: "🏢" },
          { label: "Buildings", path: "/buildings", icon: "🏛️" },
          { label: "Units", path: "/units", icon: "🚪" },
          { label: "Meters", path: "/meters", icon: "⚡" },
          { label: "Readings", path: "/readings", icon: "📈" },
          { label: "Invoices", path: "/invoices", icon: "🧾" },
          { label: "Payments", path: "/payments", icon: "💳" },
          { label: "Tariffs", path: "/tariffs", icon: "🏷️" },
          { label: "Billing Calc", path: "/billing-calculator", icon: "🧮" },
          { label: "Maintenance", path: "/maintenance", icon: "🔧" },
          { label: "Reports", path: "/reports", icon: "📑" },
        ];

      case "FACILITY_MANAGER":
        return [
          { label: "Dashboard", path: "/dashboard", icon: "📊" },
          { label: "Buildings", path: "/buildings", icon: "🏛️" },
          { label: "Units", path: "/units", icon: "🚪" },
          { label: "Meters", path: "/meters", icon: "⚡" },
          { label: "Readings", path: "/readings", icon: "📈" },
          { label: "Invoices", path: "/invoices", icon: "🧾" },
          { label: "Payments", path: "/payments", icon: "💳" },
          { label: "Billing Calc", path: "/billing-calculator", icon: "🧮" },
          { label: "Maintenance", path: "/maintenance", icon: "🔧" },
          { label: "Reports", path: "/reports", icon: "📑" },
        ];

      case "FINANCE_OFFICER":
        return [
          { label: "Dashboard", path: "/dashboard", icon: "📊" },
          { label: "Invoices", path: "/invoices", icon: "🧾" },
          { label: "Payments", path: "/payments", icon: "💳" },
          { label: "Tariffs", path: "/tariffs", icon: "🏷️" },
          { label: "Billing Calc", path: "/billing-calculator", icon: "🧮" },
          { label: "Reports", path: "/reports", icon: "📑" },
        ];

      case "TECHNICIAN":
        return [
          { label: "Dashboard", path: "/dashboard", icon: "📊" },
          { label: "Maintenance", path: "/maintenance", icon: "🔧" },
        ];

      case "UNIT_USER":
        return [
          { label: "Dashboard", path: "/dashboard", icon: "📊" },
          { label: "Consumption", path: "/consumption", icon: "⚡" },
          { label: "My Invoices", path: "/invoices", icon: "🧾" },
          { label: "My Payments", path: "/payments", icon: "💳" },
          { label: "Maintenance", path: "/maintenance", icon: "🔧" },
        ];

      default:
        return [{ label: "Dashboard", path: "/dashboard", icon: "📊" }];
    }
  };

  const navItems = getNavItems();

  const isItemActive = (path) => {
    if (path === "/dashboard" && currentPath === "/dashboard") return true;
    if (path !== "/dashboard" && currentPath.startsWith(path)) return true;
    return false;
  };

  const sidebarWidth = isCollapsed ? "72px" : "240px";

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 61, 46, 0.5)",
            backdropFilter: "blur(3px)",
            zIndex: 1050,
          }}
        />
      )}

      <aside
        style={{
          width: isMobileOpen ? "250px" : sidebarWidth,
          minWidth: isMobileOpen ? "250px" : sidebarWidth,
          backgroundColor: "#0F3D2E",
          color: "#E2E8F0",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid #14532D",
          boxShadow: "2px 0 8px rgba(15, 61, 46, 0.15)",
          zIndex: 1100,
          position: isMobileOpen ? "fixed" : "sticky",
          top: 0,
          left: isMobileOpen ? 0 : "auto",
          height: "100vh",
          userSelect: "none",
          transition: "width 0.22s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
          overflowX: "hidden",
        }}
      >
        {/* Brand Header — Clicking navigates to public landing page */}
        <div
          style={{
            padding: isCollapsed && !isMobileOpen ? "20px 12px" : "20px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed && !isMobileOpen ? "center" : "space-between",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            height: "64px",
            boxSizing: "border-box",
          }}
        >
          <Link
            to="/"
            title="Go to GreenGrid Home"
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "#16A34A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                color: "#FFFFFF",
                boxShadow: "0 2px 6px rgba(22, 163, 74, 0.4)",
                flexShrink: 0,
              }}
            >
              ⚡
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: "17px",
                    fontWeight: "800",
                    color: "#FFFFFF",
                    letterSpacing: "-0.02em",
                    lineHeight: "1.1",
                  }}
                >
                  GreenGrid
                </span>
                <span
                  style={{
                    fontSize: "9.5px",
                    color: "#86EFAC",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Energy Cloud
                </span>
              </div>
            )}
          </Link>

          {isMobileOpen && (
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "#E2E8F0",
                fontSize: "18px",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation List */}
        <div
          style={{
            flex: 1,
            padding: isCollapsed && !isMobileOpen ? "14px 8px" : "14px 10px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          {(!isCollapsed || isMobileOpen) && (
            <div
              style={{
                fontSize: "10.5px",
                fontWeight: "700",
                color: "#94A3B8",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                padding: "6px 12px 4px",
              }}
            >
              Main Menu
            </div>
          )}

          {navItems.map((item) => {
            const active = isItemActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                title={isCollapsed && !isMobileOpen ? item.label : ""}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: isCollapsed && !isMobileOpen ? "center" : "flex-start",
                  gap: "12px",
                  padding: isCollapsed && !isMobileOpen ? "10px 0" : "10px 14px",
                  borderRadius: "8px",
                  fontSize: "13.5px",
                  fontWeight: active ? "700" : "500",
                  color: active ? "#FFFFFF" : "#E2E8F0",
                  backgroundColor: active ? "#16A34A" : "transparent",
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                  boxShadow: active ? "0 2px 6px rgba(22, 163, 74, 0.3)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.backgroundColor = "rgba(22, 163, 74, 0.15)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <span style={{ fontSize: "17px", flexShrink: 0 }}>{item.icon}</span>
                {(!isCollapsed || isMobileOpen) && (
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* User / Workspace Footer */}
        <div
          style={{
            padding: isCollapsed && !isMobileOpen ? "14px 8px" : "14px 16px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            backgroundColor: "rgba(0, 0, 0, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed && !isMobileOpen ? "center" : "flex-start",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "#166534",
              border: "1px solid #16A34A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontWeight: "700",
              fontSize: "13px",
              flexShrink: 0,
            }}
          >
            {authUser?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          {(!isCollapsed || isMobileOpen) && (
            <div style={{ overflow: "hidden" }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#FFFFFF",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                }}
              >
                {authUser?.name || "User"}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#86EFAC",
                  fontWeight: "500",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                }}
              >
                {authUser?.role?.replace("_", " ") || "Member"}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
