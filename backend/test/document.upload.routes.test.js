import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";
delete process.env.MONGODB_URI;

const { app } = await import("../src/app.js");
const {
  resetUploadDocumentDependenciesForTests,
  setUploadDocumentDependenciesForTests,
} = await import("../src/services/uploads/uploadDocument.service.js");
const { createMemoryUploadDocumentRepository } = await import(
  "../src/services/uploads/uploadDocument.repository.js"
);
const { applyUsageDelta } = await import("../src/services/demo/demoUsage.service.js");

function installUploadRouteDependencies({ sessionUsage = {}, processor = null, documents = [] } = {}) {
  const repository = createMemoryUploadDocumentRepository({ documents });
  const usageSession = {
    sessionId: "demo_123",
    expiresAt: "2026-06-12T00:00:00.000Z",
    usage: {
      uploadedFiles: 0,
      chatSessions: 1,
      aiPrompts: 0,
      generatedDocuments: 0,
      userFolders: 0,
      storageBytes: 0,
      ...sessionUsage,
    },
  };

  setUploadDocumentDependenciesForTests({
    repository,
    demoSessionReader: async () => usageSession,
    demoSessionUsageUpdater: async (sessionId, delta) => {
      Object.assign(usageSession, applyUsageDelta(usageSession, delta));
      return usageSession;
    },
    storageSaver: async ({ demoSessionId, documentId, filename }) => ({
      objectKey: `demo-sessions/${demoSessionId}/uploads/${documentId}/${filename}`,
      storageProvider: "s3",
    }),
    storageReader: async () => Buffer.from("# Retried Brief"),
    processor:
      processor ||
      (async ({ document }) => ({
        status: "completed",
        document: {
          ...document,
          status: "ready",
          contentStats: {
            extractedCharCount: 7,
            optimizedCharCount: 7,
            estimatedTokenCount: 2,
            chunkCount: 1,
          },
        },
        indexing: { contentStats: { chunkCount: 1 } },
        statusSequence: ["uploaded", "extracting", "optimizing", "chunking", "embedding", "ready"],
        warnings: [],
      })),
  });

  return { repository };
}

afterEach(() => {
  resetUploadDocumentDependenciesForTests();
});

test("POST /api/documents/upload accepts one supported file and returns upload response", async () => {
  installUploadRouteDependencies();

  const response = await request(app)
    .post("/api/documents/upload")
    .set("x-demo-session-id", "demo_123")
    .field("title", "Uploaded Brief")
    .attach("file", Buffer.from("# Brief"), {
      filename: "brief.md",
      contentType: "text/markdown",
    })
    .expect(201);

  assert.equal(response.body.status, "created");
  assert.equal(response.body.document.sourceType, "upload");
  assert.equal(response.body.document.scope, "user");
  assert.equal(response.body.document.status, "ready");
  assert.equal(response.body.document.searchable, true);
  assert.equal(response.body.document.attachable, true);
  assert.equal(response.body.usage.uploadedFiles, 1);
  assert.equal("objectKey" in response.body.document, false);
});

test("upload route returns JSON errors for missing, unsupported, oversized, and multiple files", async () => {
  installUploadRouteDependencies();

  const missing = await request(app)
    .post("/api/documents/upload")
    .set("x-demo-session-id", "demo_123")
    .field("title", "Missing")
    .expect(400);
  assert.equal(missing.body.error.code, "UPLOAD_FILE_REQUIRED");

  const unsupported = await request(app)
    .post("/api/documents/upload")
    .set("x-demo-session-id", "demo_123")
    .attach("file", Buffer.from("PK"), {
      filename: "sheet.xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    .expect(400);
  assert.equal(unsupported.body.error.code, "UPLOAD_UNSUPPORTED_FILE_TYPE");

  const tooLarge = await request(app)
    .post("/api/documents/upload")
    .set("x-demo-session-id", "demo_123")
    .attach("file", Buffer.alloc(500 * 1024 + 1, "a"), {
      filename: "large.txt",
      contentType: "text/plain",
    })
    .expect(413);
  assert.equal(tooLarge.body.error.code, "UPLOAD_FILE_TOO_LARGE");

  const multiple = await request(app)
    .post("/api/documents/upload")
    .set("x-demo-session-id", "demo_123")
    .attach("file", Buffer.from("a"), { filename: "a.txt", contentType: "text/plain" })
    .attach("file", Buffer.from("b"), { filename: "b.txt", contentType: "text/plain" })
    .expect(400);
  assert.equal(multiple.body.error.code, "UPLOAD_TOO_MANY_FILES");
});

test("upload status route and retry route return safe responses", async () => {
  let processorCalls = 0;
  const ctx = installUploadRouteDependencies({
    processor: async ({ document, repository }) => {
      processorCalls += 1;
      if (processorCalls > 1) {
        const ready = await repository.updateUploadDocumentStatus({
          documentId: document._id,
          demoSessionId: "demo_123",
          patch: {
            status: "ready",
            statusMessage: null,
            contentStats: {
              extractedCharCount: 15,
              optimizedCharCount: 15,
              estimatedTokenCount: 4,
              chunkCount: 1,
            },
          },
        });
        return {
          status: "completed",
          document: ready,
          statusSequence: ["extracting", "optimizing", "chunking", "embedding", "ready"],
          warnings: [],
        };
      }
      const failed = await repository.updateUploadDocumentStatus({
        documentId: document._id,
        demoSessionId: "demo_123",
        patch: { status: "failed", statusMessage: "Processing failed." },
      });
      return {
        status: "failed",
        document: failed,
        statusSequence: ["uploaded", "extracting", "failed"],
        warnings: [{ code: "DOCUMENT_PROCESSING_FAILED" }],
      };
    },
  });

  const uploaded = await request(app)
    .post("/api/documents/upload")
    .set("x-demo-session-id", "demo_123")
    .attach("file", Buffer.from("# Brief"), {
      filename: "brief.md",
      contentType: "text/markdown",
    })
    .expect(201);

  const status = await request(app)
    .get(`/api/documents/${uploaded.body.document.id}/status`)
    .set("x-demo-session-id", "demo_123")
    .expect(200);
  assert.equal(status.body.status, "failed");
  assert.equal(status.body.downloadAvailable, true);
  assert.equal(status.body.searchable, false);
  assert.equal(status.body.attachable, false);
  assert.equal(status.body.retryAvailable, true);
  assert.equal(status.body.retryReason, null);
  assert.equal(ctx.repository._unsafeSnapshot().documents.length, 1);

  const retry = await request(app)
    .post(`/api/documents/${uploaded.body.document.id}/retry`)
    .set("x-demo-session-id", "demo_123")
    .expect(200);
  assert.equal(retry.body.status, "retried");
  assert.equal(retry.body.document.status, "ready");
  assert.equal(retry.body.document.searchable, true);
  assert.equal("objectKey" in retry.body.document, false);
});

test("retry route returns JSON errors for missing, mock, generated, and trashed documents", async () => {
  installUploadRouteDependencies({
    documents: [
      {
        id: "generated_doc",
        demoSessionId: "demo_123",
        scope: "generated",
        sourceType: "generated",
        readOnly: false,
        lifecycleStatus: "active",
        status: "failed",
        storageProvider: "s3",
        objectKey: "demo-sessions/demo_123/generated/generated_doc/brief.md",
      },
      {
        id: "trashed_upload",
        demoSessionId: "demo_123",
        scope: "user",
        sourceType: "upload",
        readOnly: false,
        lifecycleStatus: "trashed",
        status: "failed",
        storageProvider: "s3",
        objectKey: "demo-sessions/demo_123/uploads/trashed_upload/brief.md",
      },
    ],
  });

  const missing = await request(app)
    .post("/api/documents/missing_doc/retry")
    .set("x-demo-session-id", "demo_123")
    .expect(404);
  assert.equal(missing.body.error.code, "DOCUMENT_NOT_FOUND");

  const generated = await request(app)
    .post("/api/documents/generated_doc/retry")
    .set("x-demo-session-id", "demo_123")
    .expect(409);
  assert.equal(generated.body.error.code, "DOCUMENT_RETRY_UNSUPPORTED_SOURCE");

  const trashed = await request(app)
    .post("/api/documents/trashed_upload/retry")
    .set("x-demo-session-id", "demo_123")
    .expect(409);
  assert.equal(trashed.body.error.code, "DOCUMENT_TRASHED");

  const mock = await request(app)
    .post("/api/documents/mock_doc_any/retry")
    .set("x-demo-session-id", "demo_123")
    .expect(404);
  assert.equal(mock.body.error.code, "DOCUMENT_NOT_FOUND");
});
