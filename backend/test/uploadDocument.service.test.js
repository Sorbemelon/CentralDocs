import { test } from "node:test";
import assert from "node:assert/strict";

const {
  getUploadDocumentStatus,
  retryDocumentProcessing,
  uploadDocumentForDemo,
} = await import("../src/services/uploads/uploadDocument.service.js");
const { createMemoryUploadDocumentRepository } = await import(
  "../src/services/uploads/uploadDocument.repository.js"
);
const { applyUsageDelta } = await import("../src/services/demo/demoUsage.service.js");

function uploadFile({ name = "brief.md", buffer = Buffer.from("# Brief"), mimetype = "text/markdown" } = {}) {
  return {
    originalname: name,
    mimetype,
    buffer,
    size: buffer.length,
  };
}

function dependencies({
  sessionUsage = {},
  folders = [],
  storageSaver,
  processor,
} = {}) {
  const repository = createMemoryUploadDocumentRepository({ folders });
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
  const usageUpdates = [];

  return {
    repository,
    usageUpdates,
    deps: {
      repository,
      demoSessionReader: async () => usageSession,
      demoSessionUsageUpdater: async (sessionId, delta) => {
        usageUpdates.push({ sessionId, delta });
        Object.assign(usageSession, applyUsageDelta(usageSession, delta));
        return usageSession;
      },
      storageSaver:
        storageSaver ||
        (async ({ demoSessionId, documentId, filename }) => ({
          objectKey: `demo-sessions/${demoSessionId}/uploads/${documentId}/${filename}`,
          storageProvider: "s3",
        })),
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
    },
  };
}

test("upload document service saves metadata, processes document, and increments usage", async () => {
  const ctx = dependencies();
  const result = await uploadDocumentForDemo({
    demoSessionId: "demo_123",
    files: [uploadFile()],
    body: { title: "Risk Brief" },
    dependencies: ctx.deps,
  });

  assert.equal(result.document.sourceType, "upload");
  assert.equal(result.document.scope, "user");
  assert.equal(result.document.status, "ready");
  assert.equal(result.document.searchable, true);
  assert.equal(result.usage.uploadedFiles, 1);
  assert.equal(result.remaining.uploadedFiles, 4);
  assert.equal(ctx.usageUpdates.length, 1);
});

test("upload document service rejects upload and storage limits before saving", async () => {
  const uploadLimited = dependencies({ sessionUsage: { uploadedFiles: 5 } });
  await assert.rejects(
    () =>
      uploadDocumentForDemo({
        demoSessionId: "demo_123",
        files: [uploadFile()],
        dependencies: uploadLimited.deps,
      }),
    { code: "DEMO_UPLOAD_LIMIT_REACHED" },
  );

  const storageLimited = dependencies({ sessionUsage: { storageBytes: 20 * 1024 * 1024 - 4 } });
  await assert.rejects(
    () =>
      uploadDocumentForDemo({
        demoSessionId: "demo_123",
        files: [uploadFile({ buffer: Buffer.from("12345") })],
        dependencies: storageLimited.deps,
      }),
    { code: "DEMO_STORAGE_LIMIT_REACHED" },
  );
});

test("upload document service does not increment usage when storage save fails", async () => {
  const ctx = dependencies({
    storageSaver: async () => {
      const error = new Error("storage unavailable");
      error.code = "UPLOAD_STORAGE_NOT_CONFIGURED";
      error.statusCode = 503;
      throw error;
    },
  });

  await assert.rejects(
    () =>
      uploadDocumentForDemo({
        demoSessionId: "demo_123",
        files: [uploadFile()],
        dependencies: ctx.deps,
      }),
    { code: "UPLOAD_STORAGE_NOT_CONFIGURED" },
  );
  assert.equal(ctx.usageUpdates.length, 0);
  assert.equal(ctx.repository._unsafeSnapshot().documents.length, 0);
});

test("upload document service counts saved upload when processing fails", async () => {
  const ctx = dependencies({
    processor: async ({ document }) => ({
      status: "failed",
      document: {
        ...document,
        status: "failed",
        statusMessage: "Extraction failed.",
      },
      statusSequence: ["uploaded", "extracting", "failed"],
      warnings: [{ code: "DOCUMENT_PROCESSING_FAILED" }],
    }),
  });
  const result = await uploadDocumentForDemo({
    demoSessionId: "demo_123",
    files: [uploadFile()],
    dependencies: ctx.deps,
  });

  assert.equal(result.document.status, "failed");
  assert.equal(result.document.downloadAvailable, true);
  assert.equal(result.document.attachable, false);
  assert.equal(result.usage.uploadedFiles, 1);
});

test("upload document service validates user folder destinations", async () => {
  const folderId = "64b64b64b64b64b64b64b64f";
  const ctx = dependencies({
    folders: [
      {
        id: folderId,
        demoSessionId: "demo_123",
        scope: "user",
        readOnly: false,
        lifecycleStatus: "active",
      },
    ],
  });
  const result = await uploadDocumentForDemo({
    demoSessionId: "demo_123",
    files: [uploadFile()],
    body: { folderId },
    dependencies: ctx.deps,
  });
  assert.equal(result.document.folderId, folderId);

  await assert.rejects(
    () =>
      uploadDocumentForDemo({
        demoSessionId: "demo_123",
        files: [uploadFile()],
        body: { folderId: "mock_folder_strategy" },
        dependencies: ctx.deps,
      }),
    { code: "UPLOAD_FOLDER_NOT_ALLOWED" },
  );

  const trashed = dependencies({
    folders: [
      {
        id: folderId,
        demoSessionId: "demo_123",
        scope: "user",
        readOnly: false,
        lifecycleStatus: "trashed",
      },
    ],
  });
  await assert.rejects(
    () =>
      uploadDocumentForDemo({
        demoSessionId: "demo_123",
        files: [uploadFile()],
        body: { folderId },
        dependencies: trashed.deps,
      }),
    { code: "UPLOAD_FOLDER_NOT_ALLOWED" },
  );
});

test("upload status and retry services return safe status and retry boundary", async () => {
  const ctx = dependencies();
  const uploaded = await uploadDocumentForDemo({
    demoSessionId: "demo_123",
    files: [uploadFile()],
    dependencies: {
      ...ctx.deps,
      processor: async ({ document, repository }) => {
        const failed = await repository.updateUploadDocumentStatus({
          documentId: document._id,
          demoSessionId: "demo_123",
          patch: { status: "failed", statusMessage: "Embedding failed." },
        });
        return {
          status: "failed",
          document: failed,
          statusSequence: ["uploaded", "extracting", "failed"],
          warnings: [{ code: "DOCUMENT_PROCESSING_FAILED" }],
        };
      },
    },
  });
  const status = await getUploadDocumentStatus({
    documentId: uploaded.document.id,
    demoSessionId: "demo_123",
    dependencies: ctx.deps,
  });

  assert.equal(status.status, "failed");
  assert.equal(status.downloadAvailable, true);
  assert.equal(status.searchable, false);
  await assert.rejects(
    () =>
      retryDocumentProcessing({
        documentId: uploaded.document.id,
        demoSessionId: "demo_123",
        dependencies: ctx.deps,
      }),
    { code: "RETRY_NOT_AVAILABLE" },
  );
});
