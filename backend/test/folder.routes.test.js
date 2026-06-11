import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "";

const { app } = await import("../src/app.js");
const { toMockFolderId } = await import("../src/utils/ids.js");

const strategyFolderId = toMockFolderId("01-strategy-rollout");

test("GET /api/folders returns read-only mock folders without MongoDB", async () => {
  const response = await request(app).get("/api/folders").expect(200);

  assert.equal(response.body.status, "ready");
  assert.equal(response.body.persistenceStatus, "not_configured");
  assert.equal(response.body.folders.length, 6);
  assert.ok(response.body.folders.every((folder) => folder.scope === "mock"));
  assert.ok(response.body.folders.every((folder) => folder.readOnly === true));
  assert.ok(response.body.folders.every((folder) => folder.lifecycleStatus === "active"));
});

test("GET /api/folders supports scope=mock", async () => {
  const response = await request(app).get("/api/folders?scope=mock").expect(200);

  assert.equal(response.body.folders.length, 6);
  assert.ok(response.body.folders.every((folder) => folder.scope === "mock"));
});

test("GET /api/folders/:mockFolderId/documents returns mock folder documents", async () => {
  const response = await request(app)
    .get(`/api/folders/${strategyFolderId}/documents`)
    .expect(200);

  assert.equal(response.body.folder.id, strategyFolderId);
  assert.equal(response.body.documents.length, 3);
  assert.ok(response.body.documents.every((document) => document.folderId === strategyFolderId));
  assert.ok(response.body.documents.every((document) => document.readOnly === true));
});

test("POST /api/folders returns persistence error when MongoDB is not configured", async () => {
  const response = await request(app).post("/api/folders").send({ name: "New Folder" }).expect(503);

  assert.equal(response.body.error.code, "PERSISTENCE_NOT_CONFIGURED");
});

test("PATCH and DELETE mock folder return read-only error", async () => {
  const patchResponse = await request(app)
    .patch(`/api/folders/${strategyFolderId}`)
    .send({ name: "Renamed" })
    .expect(403);
  const deleteResponse = await request(app).delete(`/api/folders/${strategyFolderId}`).expect(403);

  assert.equal(patchResponse.body.error.code, "READ_ONLY_RESOURCE");
  assert.equal(deleteResponse.body.error.code, "READ_ONLY_RESOURCE");
});
