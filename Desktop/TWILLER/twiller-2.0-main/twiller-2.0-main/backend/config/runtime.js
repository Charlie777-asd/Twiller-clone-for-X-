const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return value === "true";
};

const trimTrailingSlash = (value) => value.replace(/\/+$/, "");

export const nodeEnv = process.env.NODE_ENV || "development";
export const isProduction = nodeEnv === "production";

export const getMongoUrl = () => {
  const value = process.env.MONGODB_URL || process.env.MONOGDB_URL || "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("<username>") || trimmed.includes("cluster0.mongodb.net")) {
    return "mongodb://127.0.0.1:27017/twiller";
  }
  return trimmed;
};

export const getPublicServerUrl = (port) => {
  const explicitUrl = process.env.PUBLIC_SERVER_URL?.trim();
  if (explicitUrl) return trimTrailingSlash(explicitUrl);
  return `http://localhost:${port}`;
};

export const allowMockServices = () =>
  normalizeBoolean(process.env.ALLOW_MOCK_SERVICES, !isProduction);

export const allowMockPayments = () =>
  normalizeBoolean(process.env.ALLOW_MOCK_PAYMENTS, !isProduction);

export const assertRequiredEnv = (keys) => {
  const missingKeys = keys.filter((key) => !process.env[key]?.trim());
  if (missingKeys.length > 0) {
    throw new Error(`Missing required environment variables: ${missingKeys.join(", ")}`);
  }
};
