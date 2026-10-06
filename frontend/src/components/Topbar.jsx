import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";
import ProfileModal from "./ProfileModal";

export default function Topbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const res = await API.get("/notifications/unread");
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      // Non-blocking
    }
  };

  const fetchNotificationsList = async () => {
    setLoadingNotifs(true);
    try {
      const res = await API.get("/notifications");
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const toggleNotificationPanel = () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);
    if (nextState) {
      fetchNotificationsList();
    }
  };

  const handleMarkAsRead = async (notif) => {
    try {
      await API.put(`/notifications/${notif._id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      if (notif.relatedEntityType === "Invoice") {
        setShowNotifications(false);
        navigate("/invoices");
      } else if (notif.relatedEntityType === "MaintenanceRequest") {
        setShowNotifications(false);
        navigate("/maintenance");
      }
    } catch (err) {
      console.error("Mark as read error:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await API.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
      navigate("/login");
    }
  };

  const formatRole = (role) => {
    switch (role) {
      case "PLATFORM_ADMIN": return "Platform Admin";
      case "FACILITY_MANAGER": return "Facility Manager";
      case "UNIT_USER": return "Owner / Resident";
      case "TECHNICIAN": return "Technician";
      case "FINANCE_OFFICER": return "Finance Officer";
      default: return role || "User";
    }
  };

  return (
    <>
      <header
        style={{
          height: "64px",
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #DCE5DF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          position: "sticky",
          top: 0,
          zIndex: 900,
          boxShadow: "0 1px 3px rgba(15, 61, 46, 0.04)",
        }}
      >
        {/* Left Side: Hamburger & Greeting */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={onToggleSidebar}
            title="Toggle Sidebar (Collapse / Expand)"
            style={{
              background: "#F8FAF9",
              border: "1px solid #DCE5DF",
              borderRadius: "8px",
              fontSize: "18px",
              cursor: "pointer",
              color: "#17221B",
              padding: "6px 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#EBF1ED";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#F8FAF9";
            }}
          >
            ☰
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#64748B" }}>
              Welcome back,
            </span>
            <button
              onClick={() => setShowProfileModal(true)}
              title="Click to view/edit profile"
              style={{
                background: "none",
                border: "none",
                fontSize: "14.5px",
                fontWeight: "700",
                color: "#166534",
                cursor: "pointer",
                padding: "2px 4px",
                borderRadius: "4px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>{user?.name || "User"}</span>
              <span style={{ fontSize: "12px", color: "#0F766E" }}>👤</span>
            </button>
          </div>
        </div>

        {/* Right Side: Role Badge, Notifications, Profile Button & Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", position: "relative" }}>
          {/* Role Badge */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "4px 10px",
              borderRadius: "9999px",
              fontSize: "12px",
              fontWeight: "700",
              backgroundColor: "#DCFCE7",
              color: "#166534",
              border: "1px solid #86EFAC",
            }}
          >
            {formatRole(user?.role)}
          </span>

          {/* Notification Bell Icon */}
          <div style={{ position: "relative" }}>
            <button
              onClick={toggleNotificationPanel}
              title="Notifications"
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "8px",
                backgroundColor: showNotifications ? "#DCFCE7" : "#F8FAF9",
                border: `1px solid ${showNotifications ? "#166534" : "#DCE5DF"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "17px",
                cursor: "pointer",
                position: "relative",
                transition: "all 0.15s ease",
              }}
            >
              🔔
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    backgroundColor: "#991B1B",
                    color: "#FFFFFF",
                    fontSize: "10px",
                    fontWeight: "800",
                    borderRadius: "9999px",
                    padding: "1px 5px",
                    minWidth: "16px",
                    textAlign: "center",
                    border: "2px solid #FFFFFF",
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {showNotifications && (
              <div
                style={{
                  position: "absolute",
                  top: "48px",
                  right: "0",
                  width: "360px",
                  maxHeight: "440px",
                  backgroundColor: "#FFFFFF",
                  borderRadius: "12px",
                  border: "1px solid #DCE5DF",
                  boxShadow: "0 10px 25px -5px rgba(15, 61, 46, 0.2)",
                  zIndex: 1000,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #DCE5DF",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "#F8FAF9",
                  }}
                >
                  <div style={{ fontWeight: "700", fontSize: "14px", color: "#17221B" }}>
                    Notifications ({unreadCount} unread)
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#166534",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        padding: "2px 4px",
                      }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div style={{ flex: 1, overflowY: "auto", maxHeight: "360px" }}>
                  {loadingNotifs ? (
                    <div style={{ padding: "24px", textAlign: "center", color: "#64748B", fontSize: "13px" }}>
                      Loading updates...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div style={{ padding: "32px 16px", textAlign: "center", color: "#64748B" }}>
                      <div style={{ fontSize: "24px", marginBottom: "6px" }}>✓</div>
                      <div style={{ fontSize: "13px", fontWeight: "500" }}>You're all caught up!</div>
                      <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
                        No new notifications
                      </div>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        onClick={() => handleMarkAsRead(n)}
                        style={{
                          padding: "12px 16px",
                          borderBottom: "1px solid #EBF1ED",
                          backgroundColor: n.isRead ? "#FFFFFF" : "#F0FDF4",
                          cursor: "pointer",
                          transition: "background-color 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: n.isRead ? "600" : "700",
                              color: n.isRead ? "#17221B" : "#166534",
                            }}
                          >
                            {n.title}
                          </span>
                          {!n.isRead && (
                            <span
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                backgroundColor: "#16A34A",
                                marginTop: "4px",
                              }}
                            />
                          )}
                        </div>
                        <p style={{ margin: "4px 0 6px", fontSize: "12px", color: "#475569", lineHeight: "1.4" }}>
                          {n.message}
                        </p>
                        <span style={{ fontSize: "10px", color: "#94A3B8" }}>
                          {new Date(n.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar & Button */}
          <button
            onClick={() => setShowProfileModal(true)}
            title="Open Profile"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#F8FAF9",
              border: "1px solid #DCE5DF",
              borderRadius: "20px",
              padding: "4px 10px 4px 4px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.border = "1px solid #166534";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.border = "1px solid #DCE5DF";
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: "#166534",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "700",
                fontSize: "12px",
              }}
            >
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#17221B" }}>
              Profile
            </span>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            title="Sign Out"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#FFFFFF",
              color: "#991B1B",
              border: "1px solid #FCA5A5",
              borderRadius: "8px",
              padding: "6px 12px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#FEE2E2";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#FFFFFF";
            }}
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </>
  );
}
