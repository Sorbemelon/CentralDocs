import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DEMO_IP_QUOTA_ENABLED = "true";
process.env.DEMO_IP_QUOTA_MULTIPLIER = "3";
process.env.DEMO_QUOTA_WINDOW_DAYS = "7";

const {
  applyHiddenIpQuotaUsageDelta,
  assertHiddenIpQuotaAvailable,
  createQuotaWindowRecord,
  getHiddenIpQuotaLimits,
} = await import("../src/services/demo/demoIpQuota.service.js");

function createMemoryQuotaRepository(seed = []) {
  const windows = seed.map((window, index) => ({
    _id: window._id || `quota_${index + 1}`,
    ...window,
  }));

  return {
    windows,
    isDemoIpQuotaPersistenceAvailable: () => true,
    findActiveQuotaWindow: async ({ identityHash, at }) =>
      windows.find(
        (window) =>
          window.identityHash === identityHash &&
          new Date(window.expiresAt).getTime() > new Date(at).getTime(),
      ) || null,
    createQuotaWindow: async (record) => {
      const window = {
        _id: `quota_${windows.length + 1}`,
        ...record,
      };
      windows.push(window);
      return window;
    },
    updateQuotaWindowUsage: async ({ quotaWindowId, usage }) => {
      const window = windows.find((item) => item._id === quotaWindowId);
      if (!window) return null;
      window.usage = { ...usage };
      return window;
    },
  };
}

const quotaIdentity = {
  enabled: true,
  identityHash: "safe_identity_hash",
};

test("hidden IP quota limits are three times visible session limits", () => {
  assert.deepEqual(getHiddenIpQuotaLimits(), {
    uploadedFiles: 15,
    aiPrompts: 30,
    generatedDocuments: 9,
    storageBytes: 60 * 1024 * 1024,
  });
});

test("hidden IP quota creates, reuses, and expires quota windows", async () => {
  const repository = createMemoryQuotaRepository();
  const at = new Date("2026-06-01T00:00:00.000Z");

  await assertHiddenIpQuotaAvailable({
    quotaIdentity,
    delta: { uploadedFiles: 1 },
    repository,
    at,
  });
  assert.equal(repository.windows.length, 1);
  assert.equal(repository.windows[0].identityHash, "safe_identity_hash");

  await applyHiddenIpQuotaUsageDelta({
    quotaIdentity,
    delta: { uploadedFiles: 1, storageBytes: 100 },
    repository,
    at,
  });
  assert.equal(repository.windows.length, 1);
  assert.deepEqual(repository.windows[0].usage, {
    uploadedFiles: 1,
    aiPrompts: 0,
    generatedDocuments: 0,
    storageBytes: 100,
  });

  await assertHiddenIpQuotaAvailable({
    quotaIdentity,
    delta: { aiPrompts: 1 },
    repository,
    at: new Date("2026-06-09T00:00:00.000Z"),
  });
  assert.equal(repository.windows.length, 2);
  assert.equal(repository.windows[1].usage.aiPrompts, 0);
});

test("hidden IP quota blocks configured action counters safely", async () => {
  const limits = getHiddenIpQuotaLimits();
  const repository = createMemoryQuotaRepository([
    createQuotaWindowRecord({
      identityHash: quotaIdentity.identityHash,
      at: new Date("2026-06-01T00:00:00.000Z"),
    }),
  ]);
  repository.windows[0].usage = {
    uploadedFiles: limits.uploadedFiles,
    aiPrompts: limits.aiPrompts,
    generatedDocuments: limits.generatedDocuments,
    storageBytes: limits.storageBytes,
  };

  for (const delta of [
    { uploadedFiles: 1 },
    { aiPrompts: 1 },
    { generatedDocuments: 1 },
    { storageBytes: 1 },
  ]) {
    await assert.rejects(
      () =>
        assertHiddenIpQuotaAvailable({
          quotaIdentity,
          delta,
          repository,
          at: new Date("2026-06-02T00:00:00.000Z"),
        }),
      (error) => {
        assert.equal(error.statusCode, 429);
        assert.equal(error.code, "DEMO_IP_QUOTA_LIMIT_REACHED");
        assert.equal(JSON.stringify(error).includes(quotaIdentity.identityHash), false);
        return true;
      },
    );
  }
});

test("hidden IP quota skips safely when disabled or persistence is unavailable", async () => {
  const disabled = await assertHiddenIpQuotaAvailable({
    quotaIdentity: { enabled: false, reason: "disabled" },
    delta: { uploadedFiles: 1 },
    repository: createMemoryQuotaRepository(),
  });
  assert.deepEqual(disabled, { status: "skipped", reason: "disabled" });

  const unavailable = await assertHiddenIpQuotaAvailable({
    quotaIdentity,
    delta: { uploadedFiles: 1 },
    repository: {
      isDemoIpQuotaPersistenceAvailable: () => false,
    },
  });
  assert.deepEqual(unavailable, {
    status: "skipped",
    reason: "persistence_not_configured",
  });
});
