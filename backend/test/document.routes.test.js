import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "";

const { app } = await import("../src/app.js");
const { toMockDocumentId } = await import("../src/utils/ids.js");
const {
  resetDocumentDownloadDependenciesForTests,
  setDocumentDownloadDependenciesForTests,
} = await import("../src/services/documents/documentDownload.service.js");

const briefDocumentId = toMockDocumentId(
  "01-strategy-rollout/centraldocs-transformation-brief.md",
);

afterEach(() => {
  resetDocumentDownloadDependenciesForTests();
});

test("GET /api/documents returns mock documents without MongoDB", async () => {
  const response = await request(app).get("/api/documents").expect(200);

  assert.equal(response.body.status, "ready");
  assert.equal(response.body.persistenceStatus, "not_configured");
  assert.equal(response.body.documents.length, 16);
  assert.ok(response.body.documents.every((document) => document.scope === "mock"));
  assert.ok(response.body.documents.every((document) => document.readOnly === true));
  assert.ok(response.body.documents.every((document) => document.attachable === true));
  assert.ok(response.body.documents.every((document) => !("objectKey" in document)));
});

test("GET /api/documents supports fileKind and sourceType filters", async () => {
  const imageResponse = await request(app).get("/api/documents?fileKind=image").expect(200);
  const sourceResponse = await request(app).get("/api/documents?sourceType=mock").expect(200);

  assert.equal(imageResponse.body.documents.length, 1);
  assert.equal(imageResponse.body.documents[0].fileKind, "image");
  assert.equal(sourceResponse.body.documents.length, 16);
  assert.ok(sourceResponse.body.documents.every((document) => document.sourceType === "mock"));
});

test("GET /api/documents/:mockDocumentId returns mock document detail", async () => {
  const response = await request(app).get(`/api/documents/${briefDocumentId}`).expect(200);

  assert.equal(response.body.document.id, briefDocumentId);
  assert.equal(response.body.document.title, "CentralDocs Transformation Brief");
  assert.equal(response.body.document.status, "ready");
  assert.equal(response.body.document.downloadAvailable, "pending_seed");
  assert.ok(response.body.document.demoQuestions.length > 0);
  assert.ok(!("objectKey" in response.body.document));
});

test("GET /api/documents/:mockDocumentId/preview returns manifest-derived preview", async () => {
  const response = await request(app)
    .get(`/api/documents/${briefDocumentId}/preview`)
    .expect(200);

  assert.equal(response.body.preview.title, "CentralDocs Transformation Brief");
  assert.equal(response.body.preview.fileKind, "markdown");
  assert.equal(response.body.preview.folderName, "Strategy & Rollout");
  assert.equal(response.body.preview.previewUnavailable, false);
  assert.match(response.body.preview.previewText, /Transformation goal/);
  assert.ok(response.body.preview.demoQuestions.length > 0);
});

test("PATCH and DELETE mock document return read-only error", async () => {
  const patchResponse = await request(app)
    .patch(`/api/documents/${briefDocumentId}/move`)
    .send({ folderId: null })
    .expect(403);
  const deleteResponse = await request(app).delete(`/api/documents/${briefDocumentId}`).expect(403);

  assert.equal(patchResponse.body.error.code, "READ_ONLY_RESOURCE");
  assert.equal(deleteResponse.body.error.code, "READ_ONLY_RESOURCE");
});

test("future document processing routes remain constrained", async () => {
  await request(app).post(`/api/documents/${briefDocumentId}/extract`).expect(404);
});

test("POST /api/documents/:documentId/download-url works for generated documents through safe metadata", async () => {
  const generatedDocumentId = "64b64b64b64b64b64b64b64b";
  setDocumentDownloadDependenciesForTests({
    isMongoConnected: () => true,
    findPersistentDocumentById: async () => ({
      _id: generatedDocumentId,
      demoSessionId: "demo_123",
      scope: "generated",
      sourceType: "generated",
      storageProvider: "s3",
      objectKey: "demo-sessions/demo_123/generated/64b64b64b64b64b64b64b64b/brief.md",
      downloadFilename: "brief.md",
      mimeType: "text/markdown",
      lifecycleStatus: "active",
    }),
    createPresignedDownloadUrl: async ({ downloadFilename }) => ({
      filename: downloadFilename,
      expiresInSeconds: 300,
      downloadUrl: "https://signed.example/brief.md",
      storageProvider: "s3",
    }),
  });

  const response = await request(app)
    .post(`/api/documents/${generatedDocumentId}/download-url`)
    .set("x-demo-session-id", "demo_123")
    .send({})
    .expect(200);

  assert.equal(response.body.documentId, generatedDocumentId);
  assert.equal(response.body.filename, "brief.md");
  assert.equal(response.body.downloadUrl, "https://signed.example/brief.md");
  assert.equal("objectKey" in response.body, false);
});
