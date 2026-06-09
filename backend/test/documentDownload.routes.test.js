import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";
delete process.env.MONGODB_URI;

const { app } = await import("../src/app.js");
const {
  resetDocumentDownloadDependenciesForTests,
  setDocumentDownloadDependenciesForTests,
} = await import("../src/services/documents/documentDownload.service.js");
const {
  resetS3StorageDependenciesForTests,
  setS3StorageDependenciesForTests,
} = await import("../src/services/storage/s3Storage.service.js");
const { toMockDocumentId } = await import("../src/utils/ids.js");

const briefDocumentId = toMockDocumentId(
  "01-strategy-rollout/centraldocs-transformation-brief.md",
);

afterEach(() => {
  resetDocumentDownloadDependenciesForTests();
  resetS3StorageDependenciesForTests();
});

test("POST /api/documents/:mockDocumentId/download-url returns unavailable without S3 key", async () => {
  const response = await request(app)
    .post(`/api/documents/${briefDocumentId}/download-url`)
    .expect(409);

  assert.equal(response.body.error.code, "DOWNLOAD_NOT_AVAILABLE");
  assert.equal(response.body.error.details.reason, "Mock document is not linked to S3 yet.");
});

test("POST /api/documents/:mockDocumentId/download-url returns signed URL for seeded mock record", async () => {
  let presignerInput = null;

  setDocumentDownloadDependenciesForTests({
    findSeededMockDocumentByMockId: async (documentId) => {
      if (documentId !== "mock_document_with_route_s3_key") {
        return null;
      }

      return {
        mockId: documentId,
        title: "Route S3 Mock",
        downloadFilename: "route-source.md",
        mimeType: "text/markdown",
        lifecycleStatus: "active",
        storageProvider: "s3",
        objectKey: "mock/orchid-retail/original/mock_document_with_route_s3_key/route-source.md",
      };
    },
    findMockDocumentById: async () => null,
  });
  setS3StorageDependenciesForTests({
    configured: true,
    bucket: "centraldocs-route-test",
    client: { fakeClient: true },
    presigner: async (client, command, options) => {
      presignerInput = { client, input: command.input, options };
      return "https://signed.example/route-source.md";
    },
  });

  const response = await request(app)
    .post("/api/documents/mock_document_with_route_s3_key/download-url")
    .send({ filename: "Friendly Route Name.md" })
    .expect(200);

  assert.equal(response.body.documentId, "mock_document_with_route_s3_key");
  assert.equal(response.body.filename, "Friendly_Route_Name.md");
  assert.equal(response.body.expiresInSeconds, 300);
  assert.equal(response.body.downloadUrl, "https://signed.example/route-source.md");
  assert.equal(response.body.storageProvider, "s3");
  assert.equal("objectKey" in response.body, false);
  assert.equal(presignerInput.input.Bucket, "centraldocs-route-test");
  assert.equal(
    presignerInput.input.Key,
    "mock/orchid-retail/original/mock_document_with_route_s3_key/route-source.md",
  );
  assert.equal(presignerInput.options.expiresIn, 300);
});

test("POST /api/documents/:missingMockDocumentId/download-url returns 404", async () => {
  const response = await request(app)
    .post("/api/documents/mock_document_missing/download-url")
    .expect(404);

  assert.equal(response.body.error.code, "DOCUMENT_NOT_FOUND");
});

test("download URL route is POST only and upload/retry remain unimplemented", async () => {
  await request(app).get(`/api/documents/${briefDocumentId}/download-url`).expect(404);
  await request(app).post("/api/documents/upload").expect(404);
  await request(app).post(`/api/documents/${briefDocumentId}/retry`).expect(404);
});
