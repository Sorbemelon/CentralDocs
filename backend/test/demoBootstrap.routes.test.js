import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";
delete process.env.MONGODB_URI;

const { app } = await import("../src/app.js");

test("POST /api/demo/bootstrap returns manifest-derived mock workspace", async () => {
  const response = await request(app).post("/api/demo/bootstrap").expect(200);

  assert.equal(response.body.status, "ready");
  assert.equal(response.body.workspaceTitle, "Orchid Retail Digital Transformation");
  assert.ok(response.body.sampleQuestions.length > 0);
  assert.equal(response.body.folders.length, 6);
  assert.equal(response.body.documents.length, 16);
  assert.equal(response.body.counts.mockFolders, 6);
  assert.equal(response.body.counts.mockDocuments, 16);
  assert.ok(response.body.folders.every((folder) => folder.readOnly === true));
  assert.ok(response.body.documents.every((document) => document.readOnly === true));
  assert.match(response.body.phaseLimit, /manifest/);
});

test("POST /api/demo/bootstrap includes session limits when session exists", async () => {
  const created = await request(app).post("/api/demo/session").expect(201);
  const sessionId = created.body.session.sessionId;

  const response = await request(app)
    .post("/api/demo/bootstrap")
    .set("x-demo-session-id", sessionId)
    .expect(200);

  assert.equal(response.body.session.persistence, "memory");
  assert.equal(response.body.session.mode, "foundation_memory");
  assert.equal(response.body.session.limits.maxUserFolders, 10);
  assert.equal(response.body.session.usage.uploadedFiles, 0);
  assert.equal(response.body.session.remaining.userFolders, 10);
});
