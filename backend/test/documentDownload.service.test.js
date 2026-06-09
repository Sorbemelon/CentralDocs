import { afterEach, test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
delete process.env.MONGODB_URI;

const {
  createDocumentDownloadUrl,
  resetDocumentDownloadDependenciesForTests,
} = await import("../src/services/documents/documentDownload.service.js");
const { resetS3StorageDependenciesForTests } = await import(
  "../src/services/storage/s3Storage.service.js"
);
const { toMockDocumentId } = await import("../src/utils/ids.js");

const briefDocumentId = toMockDocumentId(
  "01-strategy-rollout/centraldocs-transformation-brief.md",
);

afterEach(() => {
  resetDocumentDownloadDependenciesForTests();
  resetS3StorageDependenciesForTests();
});

test("mock document without object key returns DOWNLOAD_NOT_AVAILABLE", async () => {
  await assert.rejects(() => createDocumentDownloadUrl({ documentId: briefDocumentId }), {
    statusCode: 409,
    code: "DOWNLOAD_NOT_AVAILABLE",
  });
});

test("seeded mock document with object key returns signed URL shape", async () => {
  const response = await createDocumentDownloadUrl(
    {
      documentId: "mock_document_with_s3_key",
      requestedFilename: "Friendly Name.md",
    },
    {
      findSeededMockDocumentByMockId: async () => ({
        mockId: "mock_document_with_s3_key",
        title: "Mock S3 Doc",
        downloadFilename: "mock-source.md",
        mimeType: "text/markdown",
        lifecycleStatus: "active",
        storageProvider: "s3",
        objectKey: "mock/orchid-retail/original/mock_document_with_s3_key/mock-source.md",
      }),
      findMockDocumentById: async () => null,
      createPresignedDownloadUrl: async ({ objectKey, downloadFilename, contentType }) => {
        assert.equal(
          objectKey,
          "mock/orchid-retail/original/mock_document_with_s3_key/mock-source.md",
        );
        assert.equal(downloadFilename, "Friendly Name.md");
        assert.equal(contentType, "text/markdown");

        return {
          downloadUrl: "https://signed.example/mock-source.md",
          expiresInSeconds: 300,
          filename: "Friendly_Name.md",
          storageProvider: "s3",
        };
      },
    },
  );

  assert.deepEqual(response, {
    documentId: "mock_document_with_s3_key",
    filename: "Friendly_Name.md",
    expiresInSeconds: 300,
    downloadUrl: "https://signed.example/mock-source.md",
    storageProvider: "s3",
  });
  assert.equal("objectKey" in response, false);
});

test("manifest mock document with computed key remains unavailable when unseeded", async () => {
  await assert.rejects(
    () =>
      createDocumentDownloadUrl(
        {
          documentId: "mock_document_unseeded",
        },
        {
          findSeededMockDocumentByMockId: async () => null,
          findMockDocumentById: async () => ({
            id: "mock_document_unseeded",
            title: "Unseeded Mock S3 Doc",
            lifecycleStatus: "active",
            seeded: false,
            storageObjectKey:
              "mock/orchid-retail/original/mock_document_unseeded/mock-source.md",
          }),
        },
      ),
    {
      statusCode: 409,
      code: "DOWNLOAD_NOT_AVAILABLE",
    },
  );
});

test("user/generated document path is persistence-gated when MongoDB is absent", async () => {
  await assert.rejects(
    () =>
      createDocumentDownloadUrl({
        documentId: "64b64b64b64b64b64b64b64b",
        demoSessionId: "demo_test",
      }),
    {
      statusCode: 503,
      code: "PERSISTENCE_NOT_CONFIGURED",
    },
  );
});

test("trashed persistent document is rejected", async () => {
  await assert.rejects(
    () =>
      createDocumentDownloadUrl(
        {
          documentId: "64b64b64b64b64b64b64b64b",
          demoSessionId: "demo_test",
        },
        {
          isMongoConnected: () => true,
          findPersistentDocumentById: async () => ({
            _id: "64b64b64b64b64b64b64b64b",
            demoSessionId: "demo_test",
            scope: "user",
            storageProvider: "s3",
            objectKey: "demo-sessions/demo_test/uploads/doc/file.md",
            downloadFilename: "file.md",
            lifecycleStatus: "trashed",
          }),
        },
      ),
    {
      statusCode: 409,
      code: "DOCUMENT_TRASHED",
    },
  );
});
