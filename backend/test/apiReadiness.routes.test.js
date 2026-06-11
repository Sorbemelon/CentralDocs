import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "";

const { app } = await import("../src/app.js");

function assertNoSensitiveFields(value) {
  const text = JSON.stringify(value);
  for (const forbidden of [
    "accessKeyId",
    "secretAccessKey",
    "AWS_SECRET_ACCESS_KEY",
    "GEMINI_API_KEY",
    "mongodb+srv://",
  ]) {
    assert.equal(text.includes(forbidden), false, `${forbidden} leaked`);
  }
}

test("health endpoints are ready and dependency status is safe", async () => {
  const health = await request(app).get("/api/health").expect(200);
  const warm = await request(app).get("/api/health/warm").expect(200);
  const dependencies = await request(app).get("/api/health/dependencies").expect(200);

  assert.equal(health.body.status, "ok");
  assert.equal(health.body.service, "centraldocs-backend");
  assert.equal(warm.body.status, "awake");
  assert.ok(dependencies.body.dependencies.mongodb);
  assert.equal(typeof dependencies.body.dependencies.s3.configured, "boolean");
  assert.ok(["configured", "not_configured"].includes(dependencies.body.dependencies.gemini));
  assertNoSensitiveFields(dependencies.body);
});

test("demo bootstrap exposes mock workspace, guide, session, and clear readiness", async () => {
  const session = await request(app).post("/api/demo/session").expect(201);
  const sessionId = session.body.session.sessionId;
  assert.equal(session.body.session.status, "active");
  assert.ok(session.body.session.remaining);

  const current = await request(app)
    .get("/api/demo/session")
    .set("x-demo-session-id", sessionId)
    .expect(200);
  assert.equal(current.body.session.sessionId, sessionId);

  const bootstrap = await request(app)
    .post("/api/demo/bootstrap")
    .set("x-demo-session-id", sessionId)
    .expect(200);
  assert.ok(bootstrap.body.workspaceTitle);
  assert.ok(bootstrap.body.folders.length > 0);
  assert.ok(bootstrap.body.documents.length > 0);
  assert.equal(bootstrap.body.mockWorkspace.seeded, false);

  const guide = await request(app).get("/api/demo/guide").expect(200);
  assert.ok(guide.body.guide.sampleQuestions.length > 0);
  assert.equal(guide.body.limits.maxUploadedFiles, 5);

  const cleared = await request(app)
    .post("/api/demo/clear")
    .set("x-demo-session-id", sessionId)
    .expect(200);
  assert.equal(cleared.body.status, "cleared");
  assert.ok(cleared.body.session.sessionId);
});

test("document, folder, trash, and upload readiness responses are JSON safe", async () => {
  const folders = await request(app).get("/api/folders").expect(200);
  const documents = await request(app).get("/api/documents").expect(200);
  const trash = await request(app)
    .get("/api/trash")
    .set("x-demo-session-id", "demo_123")
    .expect(200);

  assert.ok(folders.body.folders.length > 0);
  assert.ok(documents.body.documents.length > 0);
  assert.equal(trash.body.counts.total, 0);
  assert.ok(documents.body.documents.every((document) => !("objectKey" in document)));

  const mockDocumentId = documents.body.documents[0].id;
  const detail = await request(app).get(`/api/documents/${mockDocumentId}`).expect(200);
  const preview = await request(app).get(`/api/documents/${mockDocumentId}/preview`).expect(200);
  const unavailableDownload = await request(app)
    .post(`/api/documents/${mockDocumentId}/download-url`)
    .set("x-demo-session-id", "demo_123")
    .send({})
    .expect(409);

  assert.equal(detail.body.document.id, mockDocumentId);
  assert.equal(preview.body.preview.previewUnavailable, false);
  assert.equal(unavailableDownload.body.error.code, "DOWNLOAD_NOT_AVAILABLE");
  assertNoSensitiveFields(detail.body);

  const uploadMissing = await request(app)
    .post("/api/documents/upload")
    .set("x-demo-session-id", "demo_123")
    .expect(400);
  assert.equal(uploadMissing.body.error.code, "UPLOAD_FILE_REQUIRED");
});
