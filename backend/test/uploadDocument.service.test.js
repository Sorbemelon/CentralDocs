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
  storageReader,
  storageCleaner,
  processor,
  hiddenQuotaGuard,
  hiddenQuotaUsageUpdater,
  repository = createMemoryUploadDocumentRepository({ folders }),
} = {}) {
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
      storageReader: storageReader || (async () => Buffer.from("# Brief")),
      storageCleaner: storageCleaner || (async () => ({ deleted: true })),
      hiddenQuotaGuard: hiddenQuotaGuard || (async () => ({ status: "skipped" })),
      hiddenQuotaUsageUpdater: hiddenQuotaUsageUpdater || (async () => ({ status: "skipped" })),
      processor:
        processor ||
        (async ({ document, repository }) => {
          const ready = await repository.updateUploadDocumentStatus({
            documentId: document._id,
            demoSessionId: "demo_123",
            patch: {
              status: "ready",
              statusMessage: null,
              contentStats: {
                extractedCharCount: 7,
                optimizedCharCount: 7,
                estimatedTokenCount: 2,
                chunkCount: 1,
              },
            },
          });
          return {
            status: "completed",
            document: ready,
            indexing: { contentStats: { chunkCount: 1 } },
            statusSequence: ["uploaded", "extracting", "optimizing", "chunking", "embedding", "ready"],
            warnings: [],
          };
        }),
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

test("upload document service checks and records hidden IP quota", async () => {
  const hiddenCalls = [];
  const ctx = dependencies({
    hiddenQuotaGuard: async ({ quotaIdentity, delta }) => {
      hiddenCalls.push(["guard", quotaIdentity, delta]);
      return { status: "checked" };
    },
    hiddenQuotaUsageUpdater: async ({ quotaIdentity, delta }) => {
      hiddenCalls.push(["usage", quotaIdentity, delta]);
      return { status: "updated" };
    },
  });

  await uploadDocumentForDemo({
    demoSessionId: "demo_123",
    quotaIdentity: { enabled: true, identityHash: "safe_hash" },
    files: [uploadFile({ buffer: Buffer.from("# Hidden quota") })],
    dependencies: ctx.deps,
  });

  assert.deepEqual(hiddenCalls, [
    ["guard", { enabled: true, identityHash: "safe_hash" }, { uploadedFiles: 1, storageBytes: 14 }],
    ["usage", { enabled: true, identityHash: "safe_hash" }, { uploadedFiles: 1, storageBytes: 14 }],
  ]);
});

test("upload document service blocks hidden IP quota before storage save", async () => {
  let storageCalled = false;
  const error = Object.assign(new Error("Demo usage limit reached for this period. Please try again later."), {
    statusCode: 429,
    code: "DEMO_IP_QUOTA_LIMIT_REACHED",
  });
  const ctx = dependencies({
    hiddenQuotaGuard: async () => {
      throw error;
    },
    storageSaver: async () => {
      storageCalled = true;
    },
  });

  await assert.rejects(
    () =>
      uploadDocumentForDemo({
        demoSessionId: "demo_123",
        quotaIdentity: { enabled: true, identityHash: "safe_hash" },
        files: [uploadFile()],
        dependencies: ctx.deps,
      }),
    { code: "DEMO_IP_QUOTA_LIMIT_REACHED" },
  );

  assert.equal(storageCalled, false);
  assert.equal(ctx.usageUpdates.length, 0);
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
  assert.equal(status.attachable, false);
  assert.equal(status.retryAvailable, true);
  assert.equal(status.retryReason, null);
  await assert.rejects(
    () =>
      retryDocumentProcessing({
        documentId: uploaded.document.id,
        demoSessionId: "demo_123",
        dependencies: {
          ...ctx.deps,
          storageReader: async () => Buffer.from("not a markdown binary\0"),
        },
      }),
    { code: "UPLOAD_UNSUPPORTED_FILE_TYPE" },
  );
});

test("retry failed uploaded document reads S3 object and reprocesses without usage increment", async () => {
  let processorCalls = 0;
  let readKey = null;
  const ctx = dependencies({
    storageReader: async ({ objectKey }) => {
      readKey = objectKey;
      return Buffer.from("# Retry");
    },
    processor: async ({ document, repository }) => {
      processorCalls += 1;
      if (processorCalls === 1) {
        const failed = await repository.updateUploadDocumentStatus({
          documentId: document._id,
          demoSessionId: "demo_123",
          patch: { status: "failed", statusMessage: "Extraction failed." },
        });
        return {
          status: "failed",
          document: failed,
          statusSequence: ["uploaded", "extracting", "failed"],
          warnings: [{ code: "DOCUMENT_PROCESSING_FAILED" }],
        };
      }
      const ready = await repository.updateUploadDocumentStatus({
        documentId: document._id,
        demoSessionId: "demo_123",
        patch: {
          status: "ready",
          statusMessage: null,
          contentStats: {
            extractedCharCount: 7,
            optimizedCharCount: 7,
            estimatedTokenCount: 2,
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
    },
  });

  const uploaded = await uploadDocumentForDemo({
    demoSessionId: "demo_123",
    files: [uploadFile()],
    dependencies: ctx.deps,
  });
  const retried = await retryDocumentProcessing({
    documentId: uploaded.document.id,
    demoSessionId: "demo_123",
    dependencies: ctx.deps,
  });

  assert.equal(retried.status, "retried");
  assert.equal(retried.document.status, "ready");
  assert.deepEqual(retried.processing.statusSequence, [
    "extracting",
    "optimizing",
    "chunking",
    "embedding",
    "ready",
  ]);
  assert.equal(readKey, "demo-sessions/demo_123/uploads/upload_1/brief.md");
  assert.equal(ctx.usageUpdates.length, 1);
  assert.equal(JSON.stringify(retried).includes("demo-sessions/demo_123"), false);
});

test("retry ready document requires force and can reprocess when forced", async () => {
  const ctx = dependencies();
  const uploaded = await uploadDocumentForDemo({
    demoSessionId: "demo_123",
    files: [uploadFile()],
    dependencies: ctx.deps,
  });

  await assert.rejects(
    () =>
      retryDocumentProcessing({
        documentId: uploaded.document.id,
        demoSessionId: "demo_123",
        dependencies: ctx.deps,
      }),
    { code: "DOCUMENT_RETRY_NOT_ALLOWED" },
  );

  const retried = await retryDocumentProcessing({
    documentId: uploaded.document.id,
    demoSessionId: "demo_123",
    force: true,
    dependencies: ctx.deps,
  });

  assert.equal(retried.status, "retried");
  assert.equal(retried.retry.force, true);
  assert.equal(ctx.usageUpdates.length, 1);
});

test("retry rejects mock, generated, trashed, and other-session documents", async () => {
  const repository = createMemoryUploadDocumentRepository({
    documents: [
      {
        id: "mock_doc",
        demoSessionId: null,
        scope: "mock",
        sourceType: "mock",
        readOnly: true,
        lifecycleStatus: "active",
        status: "failed",
        storageProvider: "s3",
        objectKey: "mock/orchid-retail/original/mock_doc/file.md",
      },
      {
        id: "generated_doc",
        demoSessionId: "demo_123",
        scope: "generated",
        sourceType: "generated",
        readOnly: false,
        lifecycleStatus: "active",
        status: "failed",
        storageProvider: "s3",
        objectKey: "demo-sessions/demo_123/generated/generated_doc/file.md",
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
        objectKey: "demo-sessions/demo_123/uploads/trashed_upload/file.md",
      },
      {
        id: "other_upload",
        demoSessionId: "demo_other",
        scope: "user",
        sourceType: "upload",
        readOnly: false,
        lifecycleStatus: "active",
        status: "failed",
        storageProvider: "s3",
        objectKey: "demo-sessions/demo_other/uploads/other_upload/file.md",
      },
    ],
  });
  const ctx = dependencies({ repository });

  await assert.rejects(
    () =>
      retryDocumentProcessing({
        documentId: "mock_doc",
        demoSessionId: "demo_123",
        dependencies: ctx.deps,
      }),
    { code: "DOCUMENT_NOT_FOUND" },
  );
  await assert.rejects(
    () =>
      retryDocumentProcessing({
        documentId: "generated_doc",
        demoSessionId: "demo_123",
        dependencies: ctx.deps,
      }),
    { code: "DOCUMENT_RETRY_UNSUPPORTED_SOURCE" },
  );
  await assert.rejects(
    () =>
      retryDocumentProcessing({
        documentId: "trashed_upload",
        demoSessionId: "demo_123",
        dependencies: ctx.deps,
      }),
    { code: "DOCUMENT_TRASHED" },
  );
  await assert.rejects(
    () =>
      retryDocumentProcessing({
        documentId: "other_upload",
        demoSessionId: "demo_123",
        dependencies: ctx.deps,
      }),
    { code: "DOCUMENT_NOT_FOUND" },
  );
});

test("upload cleans orphan S3 object when metadata creation fails after storage save", async () => {
  const cleanedKeys = [];
  const repository = {
    createDocumentId: () => "upload_1",
    findUploadFolderById: async () => null,
    createUploadDocumentRecord: async () => {
      const error = new Error("Mongo connection string should not leak");
      error.code = "PERSISTENCE_NOT_CONFIGURED";
      error.statusCode = 503;
      throw error;
    },
    findUploadDocumentById: async () => null,
    updateUploadDocumentStatus: async () => null,
  };
  const ctx = dependencies({
    repository,
    storageCleaner: async ({ objectKey }) => {
      cleanedKeys.push(objectKey);
      return { deleted: true };
    },
  });

  await assert.rejects(
    () =>
      uploadDocumentForDemo({
        demoSessionId: "demo_123",
        files: [uploadFile()],
        dependencies: ctx.deps,
      }),
    { code: "UPLOAD_SAVE_FAILED" },
  );

  assert.deepEqual(cleanedKeys, ["demo-sessions/demo_123/uploads/upload_1/brief.md"]);
  assert.equal(ctx.usageUpdates.length, 0);
});

test("upload surfaces safe orphan cleanup failure when cleanup cannot delete saved object", async () => {
  const repository = {
    createDocumentId: () => "upload_1",
    findUploadFolderById: async () => null,
    createUploadDocumentRecord: async () => {
      throw new Error("metadata failed");
    },
    findUploadDocumentById: async () => null,
    updateUploadDocumentStatus: async () => null,
  };
  const ctx = dependencies({
    repository,
    storageCleaner: async () => {
      const error = new Error("delete failed for demo-sessions/demo_123/uploads/upload_1/brief.md");
      error.code = "STORAGE_READ_FAILED";
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
    { code: "UPLOAD_ORPHAN_CLEANUP_FAILED" },
  );
  assert.equal(ctx.usageUpdates.length, 0);
});
