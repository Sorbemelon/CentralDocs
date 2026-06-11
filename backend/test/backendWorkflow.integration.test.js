import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "";

const { app } = await import("../src/app.js");
const {
  resetUploadDocumentDependenciesForTests,
  setUploadDocumentDependenciesForTests,
} = await import("../src/services/uploads/uploadDocument.service.js");
const { createMemoryUploadDocumentRepository } = await import(
  "../src/services/uploads/uploadDocument.repository.js"
);
const {
  resetSemanticSearchDependenciesForTests,
  setSemanticSearchDependenciesForTests,
} = await import("../src/services/search/semanticSearch.service.js");
const {
  resetChatSessionDependenciesForTests,
  setChatSessionDependenciesForTests,
} = await import("../src/services/chats/chatSession.service.js");
const { createMemoryChatSessionRepository } = await import(
  "../src/services/chats/chatSession.repository.js"
);
const {
  resetChatMessageDependenciesForTests,
  setChatMessageDependenciesForTests,
} = await import("../src/services/chats/chatMessage.service.js");
const { createMemoryChatMessageRepository } = await import(
  "../src/services/chats/chatMessage.repository.js"
);
const {
  resetGeneratedDocumentDependenciesForTests,
  setGeneratedDocumentDependenciesForTests,
} = await import("../src/services/generatedDocuments/generatedDocument.service.js");
const { createMemoryGeneratedDocumentRepository } = await import(
  "../src/services/generatedDocuments/generatedDocument.repository.js"
);
const {
  resetDocumentDownloadDependenciesForTests,
  setDocumentDownloadDependenciesForTests,
} = await import("../src/services/documents/documentDownload.service.js");
const { applyUsageDelta } = await import("../src/services/demo/demoUsage.service.js");

const generatedDocumentId = "64b64b64b64b64b64b64b64b";

function safeText(value) {
  return JSON.stringify(value);
}

function assertApiSafe(value) {
  const text = safeText(value);
  assert.equal(text.includes("objectKey"), false);
  assert.equal(text.includes("demo-sessions/demo_123"), false);
  assert.equal(text.includes("GEMINI_API_KEY"), false);
  assert.equal(text.includes("AWS_SECRET_ACCESS_KEY"), false);
  assert.equal(text.includes("mongodb+srv://"), false);
}

function installUploadWorkflowSeams() {
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
    storageReader: async () => Buffer.from("# Retried Upload"),
    processor: async ({ document, repository: uploadRepository }) => {
      if (document.downloadFilename === "failed.md" && document.status !== "failed") {
        const failed = await uploadRepository.updateUploadDocumentStatus({
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
      }

      const ready = await uploadRepository.updateUploadDocumentStatus({
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
        indexing: { contentStats: ready.contentStats },
        statusSequence: ["uploaded", "extracting", "optimizing", "chunking", "embedding", "ready"],
        warnings: [],
      };
    },
  });

  return { repository, usageSession };
}

function installSearchWorkflowSeams(document) {
  setSemanticSearchDependenciesForTests({
    queryEmbedder: async () => ({
      model: "gemini-embedding-2",
      dimensions: 768,
      embedding: Array.from({ length: 768 }, () => 0.01),
    }),
    scopeResolver: async ({ request }) => {
      const documentsById = new Map([
        [
          document.id,
          {
            id: document.id,
            title: document.title,
            fileKind: document.fileKind,
            folderName: "My Workspace",
          },
        ],
      ]);
      return {
        selectedDocumentIds: request.selectedDocumentIds,
        selectedFolderIds: request.selectedFolderIds,
        resolvedDocumentIds: [document.id],
        scope: request.scope,
        searchedDocumentCount: 1,
        documentsById,
      };
    },
    vectorRepository: {
      executeVectorSearch: async () => [
        {
          chunkId: "chunk_upload_1",
          documentId: document.id,
          chunkIndex: 0,
          contentPreview: "Uploaded rollout risk brief.",
          score: 0.93,
          sourceLocator: { sectionTitle: "Summary" },
          chunkKind: "text",
          embeddingInputType: "text",
        },
      ],
    },
  });
}

function installChatWorkflowSeams(document) {
  const chatSessionRepository = createMemoryChatSessionRepository();
  const chatMessageRepository = createMemoryChatMessageRepository();
  const selectionRepositories = {
    documentRepository: {
      listAttachableDocuments: async ({ selectedDocumentIds }) =>
        selectedDocumentIds.includes(document.id)
          ? [
              {
                id: document.id,
                title: document.title,
                fileKind: document.fileKind,
                sourceType: document.sourceType,
                scope: document.scope,
                folderId: null,
                folderName: "My Workspace",
                status: "ready",
                lifecycleStatus: "active",
              },
            ]
          : [],
    },
    folderRepository: {
      listAttachableFolders: async () => [],
    },
  };
  const chatDependencies = {
    chatSessionRepository,
    chatMessageRepository,
    selectionRepositories,
    semanticSearcher: async () => ({
      references: [
        {
          citationNumber: 1,
          documentId: document.id,
          documentTitle: document.title,
          fileType: document.fileKind,
          folderName: "My Workspace",
          chunkId: "chunk_upload_1",
          excerptPreview: "Uploaded rollout risk brief.",
          similarityScore: 0.93,
        },
      ],
      results: [],
      scope: { resolvedDocumentIds: [document.id] },
    }),
    generator: async () => ({
      text: "The uploaded brief highlights rollout ownership risk [1].",
      model: "gemini-3.5-flash",
      fallbackUsed: false,
      fallbackLevel: 0,
      keySlot: 0,
      latencyMs: 12,
      usage: { estimatedInputTokens: 80, estimatedOutputTokens: 12 },
      aiRouting: [],
    }),
  };

  setChatSessionDependenciesForTests(chatDependencies);
  setChatMessageDependenciesForTests(chatDependencies);

  return { chatSessionRepository, chatMessageRepository, selectionRepositories };
}

function installGeneratedWorkflowSeams({ chatSessionRepository, chatMessageRepository, selectionRepositories }) {
  const baseRepository = createMemoryGeneratedDocumentRepository();
  const generatedDocumentRepository = {
    ...baseRepository,
    createDocumentId: () => generatedDocumentId,
  };
  const usageSession = {
    sessionId: "demo_123",
    expiresAt: "2026-06-12T00:00:00.000Z",
    usage: {
      uploadedFiles: 1,
      chatSessions: 1,
      aiPrompts: 1,
      generatedDocuments: 0,
      userFolders: 0,
      storageBytes: 15,
    },
  };

  setGeneratedDocumentDependenciesForTests({
    chatSessionRepository,
    chatMessageRepository,
    selectionRepositories,
    generatedDocumentRepository,
    selectionResolver: async () => ({
      selectedDocumentIds: [],
      selectedFolderIds: [],
      resolvedDocuments: [],
      snapshots: {
        attachedDocumentSnapshot: [],
        attachedFolderSnapshot: [],
        resolvedDocumentSnapshot: [],
      },
    }),
    generator: async () => ({
      text: "# Rollout Brief\n\nOwnership risk should be assigned.",
      model: "gemini-3.5-flash",
      fallbackUsed: false,
      fallbackLevel: 0,
      keySlot: 0,
      latencyMs: 10,
      usage: { estimatedInputTokens: 120, estimatedOutputTokens: 30 },
      warnings: [],
    }),
    storageSaver: async ({ demoSessionId, documentId, filename }) => ({
      objectKey: `demo-sessions/${demoSessionId}/generated/${documentId}/${filename}`,
      storageProvider: "s3",
    }),
    indexer: async () => ({
      indexed: true,
      contentStats: {
        extractedCharCount: 47,
        optimizedCharCount: 47,
        estimatedTokenCount: 12,
        chunkCount: 1,
      },
      warnings: [],
    }),
    demoSessionReader: async () => usageSession,
    demoSessionUsageUpdater: async (sessionId, delta) => {
      Object.assign(usageSession, applyUsageDelta(usageSession, delta));
      return usageSession;
    },
    downloadUrlCreator: async ({ documentId, requestedFilename }) => ({
      documentId,
      filename: requestedFilename,
      expiresInSeconds: 300,
      downloadUrl: "https://signed.example/generated",
      storageProvider: "s3",
    }),
  });

  return { generatedDocumentRepository };
}

afterEach(() => {
  resetUploadDocumentDependenciesForTests();
  resetSemanticSearchDependenciesForTests();
  resetChatSessionDependenciesForTests();
  resetChatMessageDependenciesForTests();
  resetGeneratedDocumentDependenciesForTests();
  resetDocumentDownloadDependenciesForTests();
});

test("backend demo workflow is ready through fake external seams", async () => {
  await request(app).post("/api/demo/session").set("x-demo-session-id", "demo_123").expect(201);

  const bootstrap = await request(app)
    .post("/api/demo/bootstrap")
    .set("x-demo-session-id", "demo_123")
    .expect(200);
  assert.ok(bootstrap.body.documents.length > 0);
  assert.ok(bootstrap.body.folders.length > 0);

  const folders = await request(app).get("/api/folders").expect(200);
  const documents = await request(app).get("/api/documents").expect(200);
  assert.ok(folders.body.folders.every((folder) => folder.readOnly));
  assert.ok(documents.body.documents.every((document) => document.scope === "mock"));

  const persistenceBoundary = await request(app)
    .post("/api/folders")
    .set("x-demo-session-id", "demo_123")
    .send({ name: "Uploads" })
    .expect(503);
  assert.equal(persistenceBoundary.body.error.code, "PERSISTENCE_NOT_CONFIGURED");

  const uploadContext = installUploadWorkflowSeams();
  const uploaded = await request(app)
    .post("/api/documents/upload")
    .set("x-demo-session-id", "demo_123")
    .field("title", "Uploaded Risk Brief")
    .attach("file", Buffer.from("# Uploaded Risk Brief"), {
      filename: "brief.md",
      contentType: "text/markdown",
    })
    .expect(201);
  assert.equal(uploaded.body.document.status, "ready");
  assert.equal(uploaded.body.document.searchable, true);
  assert.equal(uploaded.body.document.attachable, true);
  assertApiSafe(uploaded.body);

  const failedUpload = await request(app)
    .post("/api/documents/upload")
    .set("x-demo-session-id", "demo_123")
    .attach("file", Buffer.from("# Failed Upload"), {
      filename: "failed.md",
      contentType: "text/markdown",
    })
    .expect(201);
  assert.equal(failedUpload.body.document.status, "failed");

  const retried = await request(app)
    .post(`/api/documents/${failedUpload.body.document.id}/retry`)
    .set("x-demo-session-id", "demo_123")
    .send({})
    .expect(200);
  assert.equal(retried.body.status, "retried");
  assert.equal(retried.body.document.status, "ready");
  assertApiSafe(retried.body);
  assert.equal(uploadContext.usageSession.usage.uploadedFiles, 2);

  installSearchWorkflowSeams(uploaded.body.document);
  const search = await request(app)
    .post("/api/search/semantic")
    .set("x-demo-session-id", "demo_123")
    .send({
      query: "What rollout risks are in the upload?",
      selectedDocumentIds: [uploaded.body.document.id],
      topK: 6,
    })
    .expect(200);
  assert.equal(search.body.references[0].citationNumber, 1);
  assertApiSafe(search.body);

  const chatContext = installChatWorkflowSeams(uploaded.body.document);
  const createdChat = await request(app)
    .post("/api/chats")
    .set("x-demo-session-id", "demo_123")
    .send({
      title: "Upload review",
      selectedDocumentIds: [uploaded.body.document.id],
    })
    .expect(201);
  const chatId = createdChat.body.chat.id;

  const chatAnswer = await request(app)
    .post(`/api/chats/${chatId}/messages`)
    .set("x-demo-session-id", "demo_123")
    .send({ content: "What should we do about rollout ownership?" })
    .expect(201);
  assert.equal(chatAnswer.body.assistantMessage.referencesUsed[0].citationNumber, 1);
  assert.equal(chatAnswer.body.chat.aiPromptCount, 1);
  assertApiSafe(chatAnswer.body);

  const generatedContext = installGeneratedWorkflowSeams(chatContext);
  const generated = await request(app)
    .post(`/api/chats/${chatId}/generated-documents`)
    .set("x-demo-session-id", "demo_123")
    .send({
      instruction: "Turn this chat into a concise Markdown brief.",
      filename: "rollout-brief.md",
      includeReferences: true,
      includeCurrentSelectedDocuments: true,
    })
    .expect(201);
  assert.equal(generated.body.document.scope, "generated");
  assert.equal(generated.body.document.sourceType, "generated");
  assert.equal(generated.body.generation.indexed, true);
  assertApiSafe(generated.body);

  const generatedRecord = generatedContext.generatedDocumentRepository._unsafeSnapshot()[0];
  setDocumentDownloadDependenciesForTests({
    isMongoConnected: () => true,
    findPersistentDocumentById: async () => generatedRecord,
    createPresignedDownloadUrl: async ({ downloadFilename }) => ({
      filename: downloadFilename,
      expiresInSeconds: 300,
      downloadUrl: "https://signed.example/generated-download",
      storageProvider: "s3",
    }),
  });
  const download = await request(app)
    .post(`/api/documents/${generatedDocumentId}/download-url`)
    .set("x-demo-session-id", "demo_123")
    .send({})
    .expect(200);
  assert.equal(download.body.filename, "rollout-brief.md");
  assert.equal(download.body.expiresInSeconds, 300);
  assertApiSafe(download.body);

  const trash = await request(app)
    .get("/api/trash")
    .set("x-demo-session-id", "demo_123")
    .expect(200);
  assert.equal(trash.body.counts.total, 0);

  const mockDelete = await request(app)
    .delete(`/api/documents/${documents.body.documents[0].id}`)
    .set("x-demo-session-id", "demo_123")
    .expect(403);
  assert.equal(mockDelete.body.error.code, "READ_ONLY_RESOURCE");

  const cleared = await request(app)
    .post("/api/demo/clear")
    .set("x-demo-session-id", "demo_123")
    .expect(200);
  assert.equal(cleared.body.status, "cleared");

  const afterClear = await request(app)
    .post("/api/demo/bootstrap")
    .set("x-demo-session-id", cleared.body.session.sessionId)
    .expect(200);
  assert.equal(afterClear.body.documents.length, bootstrap.body.documents.length);
});
