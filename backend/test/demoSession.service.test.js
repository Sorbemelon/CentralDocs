import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "";

const {
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
