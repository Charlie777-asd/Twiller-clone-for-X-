import axios from "axios";
import { getBackendBaseUrl } from "./backendUrl";

// Global network toast notification generator for beautiful in-app notifications
export const showGlobalNetworkToast = (message, type = "error") => {
  if (typeof document === "undefined") return;
  
  // Find or create toast container
  let container = document.getElementById("global-network-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "global-network-toast-container";
    container.style.position = "fixed";
    container.style.bottom = "24px";
    container.style.right = "24px";
    container.style.zIndex = "99999";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "10px";
    container.style.pointerEvents = "none";
    document.body.appendChild(container);
  }
  
  // Create toast element
  const toast = document.createElement("div");
  toast.style.pointerEvents = "auto";
  toast.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
  toast.style.backdropFilter = "blur(12px)";
  toast.style.border = type === "error" ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(29, 155, 240, 0.3)";
  toast.style.borderRadius = "16px";
  toast.style.padding = "16px";
  toast.style.color = "white";
  toast.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  toast.style.fontSize = "14px";
  toast.style.fontWeight = "600";
  toast.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5)";
  toast.style.display = "flex";
  toast.style.alignItems = "center";
  toast.style.gap = "12px";
  toast.style.maxWidth = "360px";
  toast.style.transform = "translateY(20px) scale(0.95)";
  toast.style.opacity = "0";
  toast.style.transition = "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)";
  
  // Status icon
  const icon = document.createElement("div");
  icon.style.display = "flex";
  icon.style.alignItems = "center";
  icon.style.justifyContent = "center";
  icon.style.width = "20px";
  icon.style.height = "20px";
  icon.style.borderRadius = "50%";
  icon.style.flexShrink = "0";
  if (type === "error") {
    icon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  } else {
    icon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d9bf0" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 12 12 12 8"></polyline><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  }
  toast.appendChild(icon);
  
  // Text wrapper
  const text = document.createElement("div");
  text.style.flexGrow = "1";
  text.innerText = message;
  toast.appendChild(text);
  
  // Dismiss button
  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "&times;";
  closeBtn.style.background = "none";
  closeBtn.style.border = "none";
  closeBtn.style.color = "#71767b";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.fontSize = "18px";
  closeBtn.style.fontWeight = "bold";
  closeBtn.style.padding = "0 4px";
  closeBtn.style.lineHeight = "1";
  closeBtn.style.flexShrink = "0";
  closeBtn.onclick = () => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-20px) scale(0.9)";
    setTimeout(() => toast.remove(), 300);
  };
  toast.appendChild(closeBtn);
  
  container.appendChild(toast);
  
  // Animation frame trigger
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0) scale(1)";
  });
  
  // Auto-dismiss safety timer
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-20px) scale(0.9)";
      setTimeout(() => toast.remove(), 300);
    }
  }, 4500);
};

const axiosInstance = axios.create({
  baseURL: getBackendBaseUrl(),
});

// Request Interceptor: Automatically inject authentication and Bearer tokens
axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const sessionId = localStorage.getItem("twitter-session-id");
    if (sessionId) {
      config.headers["x-session-id"] = sessionId;
      config.headers["Authorization"] = `Bearer ${sessionId}`;
    }
  }
  return config;
});

// Response Interceptor: Catch exceptions globally (401, 403, 404, 500+)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      const errorMsg = data?.error || data?.message || "A network error occurred.";
      
      if (status === 401) {
        // Session expired or revoked
        if (typeof window !== "undefined") {
          localStorage.removeItem("twitter-user");
          localStorage.removeItem("twitter-session-id");
          window.location.href = "/";
        }
        showGlobalNetworkToast("Session expired. Please sign in again.", "error");
      } else if (status === 403) {
        showGlobalNetworkToast(`Access Denied: ${errorMsg}`, "error");
      } else if (status === 404) {
        // Do not toast routine database lookup misses (like user checks during login)
        if (error.config && !error.config.url.includes("/loggedinuser")) {
          showGlobalNetworkToast(`Resource not found: ${errorMsg}`, "error");
        }
      } else if (status >= 500) {
        showGlobalNetworkToast(`Server error (${status}): Please try again later.`, "error");
      }
    } else if (error.request) {
      // Offline / Connection errors
      showGlobalNetworkToast("Network connection lost. Please check your internet connection.", "error");
    } else {
      showGlobalNetworkToast(`Request failed: ${error.message}`, "error");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
