import axios from "axios";
import { getBackendBaseUrl } from "./backendUrl";

const axiosInstance = axios.create({
  baseURL: getBackendBaseUrl(),
});

axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const sessionId = localStorage.getItem("twitter-session-id");
    if (sessionId) {
      config.headers["x-session-id"] = sessionId;
    }
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401 && error.response.data?.error === "SESSION_REVOKED") {
      if (typeof window !== "undefined") {
        localStorage.removeItem("twitter-user");
        localStorage.removeItem("twitter-session-id");
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
