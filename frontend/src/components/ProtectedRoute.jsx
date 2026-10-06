import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F4F7F5",
        fontFamily: "'Inter', sans-serif",
        gap: "14px",
      }}>
        <div style={{ fontSize: "28px" }}>🌿</div>
        <div style={{ fontSize: "14px", fontWeight: "600", color: "#166534" }}>
          Authenticating GreenGrid Session...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;