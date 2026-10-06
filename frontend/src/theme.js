// GreenGrid Final Design System — Clean Energy & Smart Utility SaaS System
// Strict Color Palette for Phases 7, 8, 9, 10

export const theme = {
  colors: {
    // Primary Layout
    bg: "#F4F7F5",             // Page Canvas Background
    sidebar: "#0F3D2E",        // Fixed Sidebar Background
    sidebarActive: "#16A34A",  // Sidebar Active Item
    sidebarHover: "rgba(22, 163, 74, 0.15)",
    sidebarText: "#E2E8F0",    // Sidebar Text
    sidebarTextMuted: "#94A3B8",
    topbar: "#FFFFFF",         // Topbar Background
    topbarBorder: "#DCE5DF",   // Topbar Border

    // Cards & Surfaces
    card: "#FFFFFF",           // Card Background
    cardBorder: "#DCE5DF",     // Card Border
    surface: "#FFFFFF",
    surfaceAlt: "#F8FAF9",
    border: "#DCE5DF",
    borderLight: "#EBF1ED",
    borderFocus: "#166534",

    // Typography
    heading: "#17221B",        // Headings Text
    textPrimary: "#17221B",    // Main Body Text
    textSecondary: "#475569",  // Muted Body Text
    textMuted: "#64748B",

    // Brand & Buttons
    primary: "#166534",        // Primary Green Button / Brand
    primaryHover: "#15803D",
    primaryActive: "#16A34A",
    primaryLight: "#DCFCE7",
    primaryBorder: "#86EFAC",

    secondary: "#0F766E",      // Secondary Teal
    secondaryHover: "#115E59",
    secondaryLight: "#CCFBF1",
    secondaryBorder: "#5EEAD4",

    // Status Badges
    activeBg: "#DCFCE7",       // Normal / Active Badge BG
    activeText: "#166534",     // Normal / Active Badge Text

    maintenanceBg: "#FEF3C7",  // Maintenance / Warning Badge BG
    maintenanceText: "#92400E",// Maintenance / Warning Badge Text

    criticalBg: "#FEE2E2",     // Critical / Overdue Badge BG
    criticalText: "#991B1B",   // Critical / Overdue Badge Text

    // Status mapping helpers
    success: "#166534",
    successBg: "#DCFCE7",
    warning: "#D97706",
    warningBg: "#FEF3C7",
    danger: "#991B1B",
    dangerBg: "#FEE2E2",
    info: "#0284C7",
    infoBg: "#E0F2FE",

    // Charts
    chartConsumption: "#16A34A",
    chartCost: "#0F766E",
    chartPrevious: "#94A3B8",
    chartHighUsage: "#D97706",
  },
  shadows: {
    xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    sm: "0 1px 3px 0 rgba(15, 61, 46, 0.06), 0 1px 2px -1px rgba(15, 61, 46, 0.04)",
    md: "0 4px 6px -1px rgba(15, 61, 46, 0.07), 0 2px 4px -2px rgba(15, 61, 46, 0.04)",
    lg: "0 10px 15px -3px rgba(15, 61, 46, 0.08), 0 4px 6px -4px rgba(15, 61, 46, 0.04)",
    modal: "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
  },
  radii: {
    xs: "4px",
    sm: "6px",
    md: "10px",
    lg: "14px",
    xl: "20px",
    full: "9999px",
  },
};

export const commonStyles = {
  // App Canvas
  appLayout: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#F4F7F5",
    color: "#17221B",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  mainContentWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    backgroundColor: "#F4F7F5",
  },
  pageContainer: {
    padding: "32px 36px",
    maxWidth: "1400px",
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "28px",
    flexWrap: "wrap",
    gap: "16px",
  },
  titleGroup: {
    textAlign: "left",
  },
  pageTitle: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#17221B",
    margin: "0 0 6px 0",
    letterSpacing: "-0.02em",
  },
  pageSubtitle: {
    fontSize: "14px",
    color: "#475569",
    margin: 0,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },

  // Buttons
  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    backgroundColor: "#166534",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    padding: "10px 18px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(22, 101, 52, 0.2)",
    transition: "all 0.15s ease",
  },
  secondaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    backgroundColor: "#0F766E",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    padding: "10px 18px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  outlineBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    backgroundColor: "#FFFFFF",
    color: "#17221B",
    border: "1px solid #DCE5DF",
    borderRadius: "8px",
    padding: "9px 16px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  dangerBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    backgroundColor: "#991B1B",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    padding: "10px 18px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },

  // Cards
  card: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #DCE5DF",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 1px 3px 0 rgba(15, 61, 46, 0.06)",
    boxSizing: "border-box",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  cardTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#17221B",
    margin: 0,
  },

  // Stat Card
  statCard: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #DCE5DF",
    borderRadius: "12px",
    padding: "20px 24px",
    boxShadow: "0 1px 3px 0 rgba(15, 61, 46, 0.05)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  statLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    margin: 0,
  },
  statValue: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#17221B",
    letterSpacing: "-0.02em",
    margin: 0,
  },
  statSubtext: {
    fontSize: "13px",
    color: "#0F766E",
    margin: 0,
    fontWeight: "500",
  },

  // Form Inputs
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
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#17221B",
    marginBottom: "6px",
  },
  formGroup: {
    marginBottom: "18px",
  },

  // Tables
  tableContainer: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #DCE5DF",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(15, 61, 46, 0.05)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: "14px",
  },
  th: {
    backgroundColor: "#F8FAF9",
    color: "#475569",
    fontWeight: "600",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    padding: "14px 18px",
    borderBottom: "1px solid #DCE5DF",
  },
  td: {
    padding: "14px 18px",
    borderBottom: "1px solid #EBF1ED",
    color: "#17221B",
    verticalAlign: "middle",
  },
  trHover: {
    transition: "background-color 0.15s ease",
  },

  // Badges
  badgeActive: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    borderRadius: "9999px",
    fontSize: "12px",
    fontWeight: "600",
    backgroundColor: "#DCFCE7",
    color: "#166534",
  },
  badgeMaintenance: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    borderRadius: "9999px",
    fontSize: "12px",
    fontWeight: "600",
    backgroundColor: "#FEF3C7",
    color: "#92400E",
  },
  badgeCritical: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    borderRadius: "9999px",
    fontSize: "12px",
    fontWeight: "600",
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
  },
  badgeNeutral: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    borderRadius: "9999px",
    fontSize: "12px",
    fontWeight: "600",
    backgroundColor: "#F1F5F9",
    color: "#475569",
  },

  // Modal
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 61, 46, 0.4)",
    backdropFilter: "blur(3px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: "14px",
    border: "1px solid #DCE5DF",
    maxWidth: "560px",
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)",
    padding: "28px",
    boxSizing: "border-box",
  },

  // State Views
  emptyState: {
    textAlign: "center",
    padding: "48px 24px",
    color: "#64748B",
  },
  loadingSpinner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 0",
    color: "#166534",
    fontSize: "15px",
    fontWeight: "500",
    gap: "12px",
  },
};
