import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      localStorage.getItem("refreshToken")
    ) {
      originalRequest._retry = true;
      try {
        const { data } = await api.post("/auth/refresh", {
          refreshToken: localStorage.getItem("refreshToken"),
        });
        localStorage.setItem("token", data.accessToken);
        api.defaults.headers.common["Authorization"] = `Bearer ${data.accessToken}`;
        originalRequest.headers["Authorization"] = `Bearer ${data.accessToken}`;
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("refreshToken");
        alert("Tu sesión expiró. Por favor, inicia sesión nuevamente.");
        window.location.href = "/auth/login";
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const requestPasswordReset = async (email) => {
  const { data } = await api.post("/auth/request-password-reset", { email });
  return data;
};

export const resetPassword = async (token, newPassword) => {
  const { data } = await api.post("/auth/reset-password", { token, newPassword });
  return data;
};