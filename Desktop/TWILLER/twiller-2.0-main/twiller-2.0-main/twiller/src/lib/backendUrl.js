const DEFAULT_BACKEND_URL = "http://localhost:5000";

const trimTrailingSlash = (value) => value.replace(/\/+$/, "");

export const getBackendBaseUrl = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  return trimTrailingSlash(configuredUrl || DEFAULT_BACKEND_URL);
};

export const buildBackendUrl = (path = "") => {
  if (!path) return getBackendBaseUrl();
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getBackendBaseUrl()}${normalizedPath}`;
};

/** Resolve avatar, cover, tweet media, and upload paths against the API base URL. */
export const mediaUrl = (path) => {
  if (!path) return "";
  return buildBackendUrl(path);
};

/** Encode email for use in URL path segments (e.g. /userupdate/:email). */
export const encodeEmailPath = (email) => encodeURIComponent(email);
