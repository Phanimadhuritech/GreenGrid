import axios from "axios";

// Read API URL from environment, fallback to localhost:5000/api in development
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const API = axios.create({
  baseURL,
  withCredentials: true,
});

export default API;