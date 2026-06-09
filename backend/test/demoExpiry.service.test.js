import { test } from "node:test";
import assert from "node:assert/strict";

const {
  buildExpiredSessionFilter,
  cleanupExpiredDemoSessions,
  expireSessionIfNeeded,
} = await import("../src/services/demo/demoExpiry.service.js");

test("expiry service builds expired session filter", () => {
  const currentTime = new Date("2026-06-09T00:00:00.000Z");
  const filter = buildExpiredSessionFilter(currentTime);

  assert.equal(filter.status, "active");
  assert.deepEqual(filter.expiresAt, { $lte: currentTime });
});

test("expiry service identifies expired and active sessions", () => {
  const currentTime = new Date("2026-06-09T00:00:00.000Z");
  const expired = expireSessionIfNeeded(
    {
      sessionId: "demo_expired",
      status: "active",
      expiresAt: "2026-06-08T00:00:00.000Z",
      cleanupStatus: "not_started",
    },
    currentTime,
  );
  const active = expireSessionIfNeeded(
    {
      sessionId: "demo_active",
      status: "active",
      expiresAt: "2026-06-10T00:00:00.000Z",
      cleanupStatus: "not_started",
    },
    currentTime,
  );

  assert.equal(expired.status, "expired");
  assert.equal(expired.cleanupStatus, "pending");
  assert.equal(active.status, "active");
});

test("expiry cleanup returns skipped when persistence is not configured", async () => {
  const result = await cleanupExpiredDemoSessions({
    repository: {
      isDemoSessionPersistenceAvailable: () => false,
    },
  });

  assert.equal(result.status, "skipped_not_configured");
  assert.equal(result.expiredCount, 0);
});

test("expiry cleanup marks and cleans expired sessions with mocked dependencies", async () => {
  const calls = [];
  const result = await cleanupExpiredDemoSessions({
    repository: {
      isDemoSessionPersistenceAvailable: () => true,
      findExpiredSessions: async () => [{ sessionId: "demo_expired" }],
      markExpired: async (sessionId) => calls.push(["markExpired", sessionId]),
    },
    cleanup: async (sessionId) => calls.push(["cleanup", sessionId]),
  });

  assert.equal(result.status, "completed");
  assert.equal(result.expiredCount, 1);
  assert.equal(result.cleanedCount, 1);
  assert.deepEqual(calls, [
    ["markExpired", "demo_expired"],
    ["cleanup", "demo_expired"],
  ]);
});
