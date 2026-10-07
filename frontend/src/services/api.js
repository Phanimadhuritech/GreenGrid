import axios from "axios";

// Read API URL from environment, fallback to localhost:5000/api in development
const baseURL = import.meta.env.VITE_API_URL || "https://greengrid-gd7q.onrender.com/api";

const API = axios.create({
  baseURL,
  withCredentials: true,
});

// Attach Authorization Bearer token header if token exists in localStorage (supports cross-origin third-party cookie restrictions)
API.interceptors.request.use(
  (config) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("greengrid_token") : null;
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (_) {
      // Storage unavailable fallback
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default API;