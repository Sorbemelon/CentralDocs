import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "";
process.env.AWS_REGION = "";
process.env.AWS_S3_BUCKET = "";
process.env.AWS_ACCESS_KEY_ID = "";
process.env.AWS_SECRET_ACCESS_KEY = "";
process.env.GEMINI_API_KEY_1 = "";
process.env.GEMINI_API_KEY_2 = "";
process.env.GEMINI_API_KEY_3 = "";
process.env.GEMINI_API_KEYS = "";
process.env.DEMO_CLEAR_RESETS_USAGE = "";

const { app } = await import("../src/app.js");

test("POST /api/demo/session creates a foundation-memory demo session", async () => {
  const response = await request(app).post("/api/demo/session").expect(201);

  assert.equal(response.body.status, "ready");
  assert.equal(response.body.mode, "foundation_memory");
  assert.match(response.body.session.sessionId, /^demo_/);
  assert.equal(response.body.session.persistence, "memory");
  assert.equal(response.body.session.mode, "foundation_memory");
  assert.equal(response.body.session.limits.sessionLifetimeDays, 3);
  assert.equal(response.body.session.usage.uploadedFiles, 0);
  assert.equal(response.body.session.remaining.uploadedFiles, 5);
  assert.ok(response.headers["set-cookie"]?.some((cookie) => cookie.includes("centraldocs_demo_session")));
});

test("GET /api/demo/session returns current session with header", async () => {
  const created = await request(app).post("/api/demo/session").expect(201);
  const sessionId = created.body.session.sessionId;

  const current = await request(app)
    .get("/api/demo/session")
    .set("x-demo-session-id", sessionId)
    .expect(200);

  assert.equal(current.body.status, "ready");
  assert.equal(current.body.mode, "foundation_memory");
  assert.equal(current.body.session.sessionId, sessionId);
  assert.equal(current.body.session.persistence, "memory");
  assert.equal(current.body.session.remaining.chatSessions, 5);
});

test("POST /api/demo/clear returns cleared foundation response", async () => {
  const created = await request(app).post("/api/demo/session").expect(201);
  const sessionId = created.body.session.sessionId;

  const response = await request(app)
    .post("/api/demo/clear")
    .set("x-demo-session-id", sessionId)
    .expect(200);

  assert.equal(response.body.status, "cleared");
  assert.equal(response.body.previousSessionId, sessionId);
  assert.match(response.body.session.sessionId, /^demo_/);
  assert.notEqual(response.body.session.sessionId, sessionId);
  assert.equal(response.body.session.usage.uploadedFiles, 0);
  assert.equal(response.body.session.remaining.storageBytes, 20 * 1024 * 1024);
  assert.equal(response.body.cleanup.mongo, "skipped_not_configured");
  assert.equal(response.body.cleanup.s3, "skipped_not_configured");
  assert.deepEqual(response.body.clearPolicy, {
    usageReset: true,
    reason: "development_mode",
  });
});

test("GET /api/demo/guide returns guide counts from manifest", async () => {
  const response = await request(app).get("/api/demo/guide").expect(200);

  assert.equal(response.body.status, "ready");
  assert.equal(response.body.guide.workspaceTitle, "Orchid Retail Digital Transformation");
  assert.ok(response.body.guide.sampleQuestions.length > 0);
  assert.equal(response.body.guide.folders.length, 6);
  assert.equal(response.body.guide.documentCount, 16);
  assert.equal(response.body.limits.maxChatSessions, 5);
});
