/**
 * Axios API client for auth and API calls.
 * - Login uses POST /api/auth/login (no Authorization header).
 * - Other endpoints send JWT via Authorization header.
 */
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "";

export const axiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Add JWT to requests (skip for login/register)
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && !config.url?.includes("/auth/login")) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url?.includes("/auth/login")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  async login(email, password, role = null) {
    const body = {
      email: String(email).trim().toLowerCase(),
      password: String(password),
    };
    if (role) body.role = role;
    const { data } = await axiosInstance.post("/api/auth/login", body);
    return data;
  },
};

export default axiosInstance;
