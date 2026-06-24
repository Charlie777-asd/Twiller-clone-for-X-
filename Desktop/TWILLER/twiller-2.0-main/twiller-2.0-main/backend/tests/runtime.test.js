import test from "node:test";
import assert from "node:assert/strict";
import {
  allowMockPayments,
  allowMockServices,
  getMongoUrl,
} from "../config/runtime.js";

test("getMongoUrl prefers the canonical env var", () => {
  const originalMongoUrl = process.env.MONGODB_URL;
  const originalLegacyMongoUrl = process.env.MONOGDB_URL;

  process.env.MONGODB_URL = "mongodb://primary";
  process.env.MONOGDB_URL = "mongodb://legacy";

  assert.equal(getMongoUrl(), "mongodb://primary");

  process.env.MONGODB_URL = originalMongoUrl;
  process.env.MONOGDB_URL = originalLegacyMongoUrl;
});

test("mock flags default to enabled outside production", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalMockServices = process.env.ALLOW_MOCK_SERVICES;
  const originalMockPayments = process.env.ALLOW_MOCK_PAYMENTS;

  process.env.NODE_ENV = "development";
  delete process.env.ALLOW_MOCK_SERVICES;
  delete process.env.ALLOW_MOCK_PAYMENTS;

  assert.equal(allowMockServices(), true);
  assert.equal(allowMockPayments(), true);

  process.env.NODE_ENV = originalNodeEnv;
  process.env.ALLOW_MOCK_SERVICES = originalMockServices;
  process.env.ALLOW_MOCK_PAYMENTS = originalMockPayments;
});
