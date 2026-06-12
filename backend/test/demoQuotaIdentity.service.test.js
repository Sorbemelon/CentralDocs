import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DEMO_IP_QUOTA_ENABLED = "";
process.env.DEMO_IP_HASH_SECRET = "";

const {
  getClientIpFromRequest,
  hashClientIp,
  normalizeClientIp,
} = await import("../src/services/demo/demoQuotaIdentity.service.js");

test("quota identity normalizes client IP without storing raw IP in hash output", () => {
  assert.equal(normalizeClientIp("::ffff:203.0.113.10"), "203.0.113.10");
  assert.equal(normalizeClientIp("203.0.113.10:54321"), "203.0.113.10");

  const hash = hashClientIp("203.0.113.10", "test-secret");

  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash.includes("203.0.113.10"), false);
});

test("same IP and secret produce same hash while different IP changes hash", () => {
  const first = hashClientIp("203.0.113.10", "test-secret");
  const second = hashClientIp("::ffff:203.0.113.10", "test-secret");
  const different = hashClientIp("203.0.113.11", "test-secret");

  assert.equal(first, second);
  assert.notEqual(first, different);
});

test("trusted proxy IP resolution uses first Express req.ips value", () => {
  const request = {
    ips: ["198.51.100.7", "10.0.0.2"],
    ip: "10.0.0.2",
  };

  assert.equal(getClientIpFromRequest(request), "198.51.100.7");
});
