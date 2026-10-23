import axios from "axios";

const API_URL = "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: (email: string, password: string) => 
    api.post("/api/auth/login", { email, password }),
  register: (data: any) => api.post("/api/auth/register", data),
  getMe: () => api.get("/api/auth/me"),
};
