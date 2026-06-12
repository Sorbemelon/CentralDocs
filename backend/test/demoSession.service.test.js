import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "";
process.env.DEMO_CLEAR_RESETS_USAGE = "";

const {
  applyDemoSessionUsageDelta,
  clearDemoSession,
  createOrResumeDemoSession,
  getDemoSession,
  resetDemoSessionMemoryForTests,
} = await import("../src/services/demo/demoSession.service.js");

beforeEach(() => {
  resetDemoSessionMemoryForTests();
});

test("demo session service creates foundation-memory session when MongoDB is absent", async () => {
  const session = await createOrResumeDemoSession();

  assert.match(session.sessionId, /^demo_/);
  assert.equal(session.status, "active");
  assert.equal(session.mode, "foundation_memory");
  assert.equal(session.persistence, "memory");
  assert.equal(session.usage.uploadedFiles, 0);
  assert.equal(session.remaining.uploadedFiles, 5);
  assert.equal(session.remaining.storageBytes, 20 * 1024 * 1024);
});

test("demo session service resumes by ID and updates lastActiveAt", async () => {
  const created = await createOrResumeDemoSession();
  await new Promise((resolve) => setTimeout(resolve, 5));

  const resumed = await createOrResumeDemoSession(created.sessionId);

  assert.equal(resumed.sessionId, created.sessionId);
  assert.ok(new Date(resumed.lastActiveAt).getTime() >= new Date(created.lastActiveAt).getTime());
});

test("demo session service computes expiresAt as three days", async () => {
  const session = await createOrResumeDemoSession();
  const createdAt = new Date(session.createdAt).getTime();
  const expiresAt = new Date(session.expiresAt).getTime();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

  assert.ok(Math.abs(expiresAt - createdAt - threeDaysMs) < 1000);
  assert.equal(session.limits.sessionLifetimeDays, 3);
});

test("getDemoSession returns current state with usage and remaining", async () => {
  const created = await createOrResumeDemoSession();
  const current = await getDemoSession(created.sessionId);

  assert.equal(current.sessionId, created.sessionId);
  assert.deepEqual(current.usage, created.usage);
  assert.equal(current.remaining.chatSessions, 5);
  assert.equal(current.remaining.aiPrompts, 10);
});

test("clearDemoSession resets usage when clear policy allows reset", async () => {
  const created = await createOrResumeDemoSession();
  await applyDemoSessionUsageDelta(created.sessionId, {
    uploadedFiles: 2,
    generatedDocuments: 1,
    aiPrompts: 4,
    chatSessions: 1,
    userFolders: 2,
    storageBytes: 4096,
  });

  const result = await clearDemoSession(created.sessionId, {
    clearPolicy: {
      usageReset: true,
      reason: "development_mode",
    },
  });

  assert.equal(result.status, "cleared");
  assert.deepEqual(result.clearPolicy, {
    usageReset: true,
    reason: "development_mode",
  });
  assert.notEqual(result.session.sessionId, created.sessionId);
  assert.equal(result.session.usage.uploadedFiles, 0);
  assert.equal(result.session.usage.generatedDocuments, 0);
  assert.equal(result.session.usage.aiPrompts, 0);
  assert.equal(result.session.usage.chatSessions, 0);
  assert.equal(result.session.usage.userFolders, 0);
  assert.equal(result.session.usage.storageBytes, 0);
  assert.equal(result.session.remaining.uploadedFiles, 5);
  assert.equal(await getDemoSession(created.sessionId), null);
});

test("clearDemoSession preserves usage when production quota policy disables reset", async () => {
  const created = await createOrResumeDemoSession();
  const used = await applyDemoSessionUsageDelta(created.sessionId, {
    uploadedFiles: 2,
    generatedDocuments: 1,
    aiPrompts: 4,
    chatSessions: 1,
    userFolders: 2,
    storageBytes: 4096,
  });

  const result = await clearDemoSession(created.sessionId, {
    clearPolicy: {
      usageReset: false,
      reason: "production_quota_window",
    },
  });

  assert.equal(result.status, "cleared");
  assert.deepEqual(result.clearPolicy, {
    usageReset: false,
    reason: "production_quota_window",
  });
  assert.notEqual(result.session.sessionId, created.sessionId);
  assert.deepEqual(result.session.usage, {
    ...used.usage,
    chatSessions: 0,
  });
  assert.equal(result.session.remaining.uploadedFiles, 3);
  assert.equal(result.session.remaining.generatedDocuments, 2);
  assert.equal(result.session.remaining.aiPrompts, 6);
  assert.equal(result.session.remaining.chatSessions, 5);
  assert.equal(result.session.remaining.userFolders, 8);
  assert.equal(result.session.remaining.storageBytes, 20 * 1024 * 1024 - 4096);
  assert.equal(await getDemoSession(created.sessionId), null);
});
