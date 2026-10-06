import { createContext, useContext, useEffect, useState } from "react";
import API from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getCurrentUser = async () => {
    try {
      setLoading(true);
      const response = await API.get("/auth/me");
      setUser(response.data.user || null);
    } catch (error) {
      // Cleanly handle 401 when user is not authenticated
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentUser();
  }, []);

  const login = async (email, password) => {
    const response = await API.post("/auth/login", {
      email,
      password,
    });

    if (response.data?.user) {
      setUser(response.data.user);
      // Fetch fully populated user profile (with organization and unit)
      try {
        const fullUserRes = await API.get("/auth/me");
        if (fullUserRes.data?.user) {
          setUser(fullUserRes.data.user);
        }
      } catch (_) {
        // Fallback to basic user from login response
      }
    }

    return response.data;
  };

  const logout = async () => {
    try {
      await API.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        getCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};