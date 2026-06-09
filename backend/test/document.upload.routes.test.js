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

function installUploadRouteDependencies({ sessionUsage = {}, processor = null } = {}) {
  const repository = createMemoryUploadDocumentRepository();
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
  const ctx = installUploadRouteDependencies({
    processor: async ({ document, repository }) => {
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
  assert.equal(ctx.repository._unsafeSnapshot().documents.length, 1);

  const retry = await request(app)
    .post(`/api/documents/${uploaded.body.document.id}/retry`)
    .set("x-demo-session-id", "demo_123")
    .expect(409);
  assert.equal(retry.body.error.code, "RETRY_NOT_AVAILABLE");
});
