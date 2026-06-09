import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";
delete process.env.MONGODB_URI;

const { app } = await import("../src/app.js");
const {
  resetGeneratedDocumentDependenciesForTests,
  setGeneratedDocumentDependenciesForTests,
} = await import("../src/services/generatedDocuments/generatedDocument.service.js");
const { createMemoryGeneratedDocumentRepository } = await import(
  "../src/services/generatedDocuments/generatedDocument.repository.js"
);
const { createMemoryChatMessageRepository } = await import(
  "../src/services/chats/chatMessage.repository.js"
);
const { createMemoryChatSessionRepository } = await import(
  "../src/services/chats/chatSession.repository.js"
);
const { applyUsageDelta } = await import("../src/services/demo/demoUsage.service.js");

function installRouteDependencies({ sessionUsage = {}, messages = null } = {}) {
  const generatedDocumentRepository = createMemoryGeneratedDocumentRepository();
  const chatSessionRepository = createMemoryChatSessionRepository({
    seed: [
      {
        id: "chat_1",
        demoSessionId: "demo_123",
        title: "Rollout risks",
        currentSelectedDocumentIds: ["mock_doc_1"],
      },
    ],
  });
  const chatMessageRepository = createMemoryChatMessageRepository({
    seed:
      messages ||
      [
        {
          id: "message_1",
          chatSessionId: "chat_1",
          demoSessionId: "demo_123",
          role: "user",
          content: "What are the risks?",
        },
        {
          id: "message_2",
          chatSessionId: "chat_1",
          demoSessionId: "demo_123",
          role: "assistant",
          content: "Approval ownership is the risk [1].",
          referencesUsed: [
            {
              citationNumber: 1,
              documentId: "mock_doc_1",
              documentTitle: "Risk Register",
              chunkId: "chunk_1",
              excerptPreview: "Approval owner missing.",
            },
          ],
        },
      ],
  });
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

  setGeneratedDocumentDependenciesForTests({
    chatSessionRepository,
    chatMessageRepository,
    generatedDocumentRepository,
    selectionResolver: async () => ({
      selectedDocumentIds: ["mock_doc_1"],
      selectedFolderIds: [],
      resolvedDocuments: [{ id: "mock_doc_1", title: "Risk Register", fileKind: "csv" }],
      snapshots: {
        attachedDocumentSnapshot: [{ id: "mock_doc_1", title: "Risk Register" }],
        attachedFolderSnapshot: [],
        resolvedDocumentSnapshot: [{ id: "mock_doc_1", title: "Risk Register" }],
      },
    }),
    generator: async () => ({
      text: "# Brief\n\nApproval ownership needs an owner.",
      model: "gemini-3.5-flash",
      fallbackUsed: false,
      fallbackLevel: 0,
      keySlot: 0,
      latencyMs: 11,
      usage: { estimatedInputTokens: 100, estimatedOutputTokens: 20 },
      warnings: [],
    }),
    storageSaver: async ({ demoSessionId, documentId, filename }) => ({
      objectKey: `demo-sessions/${demoSessionId}/generated/${documentId}/${filename}`,
      storageProvider: "s3",
    }),
    indexer: async () => ({
      indexed: true,
      contentStats: {
        extractedCharCount: 40,
        optimizedCharCount: 40,
        estimatedTokenCount: 10,
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

  return { generatedDocumentRepository, chatMessageRepository };
}

afterEach(() => {
  resetGeneratedDocumentDependenciesForTests();
});

test("POST /api/chats/:chatId/generated-documents returns generated document response", async () => {
  installRouteDependencies();

  const response = await request(app)
    .post("/api/chats/chat_1/generated-documents")
    .set("x-demo-session-id", "demo_123")
    .send({
      instruction: "Turn this chat into a concise internal briefing.",
      filename: "orchid-rollout-brief.md",
      includeReferences: true,
      includeCurrentSelectedDocuments: true,
    })
    .expect(201);

  assert.equal(response.body.status, "created");
  assert.equal(response.body.document.sourceType, "generated");
  assert.equal(response.body.document.scope, "generated");
  assert.equal(response.body.document.downloadAvailable, true);
  assert.equal(response.body.generation.model, "gemini-3.5-flash");
  assert.equal(response.body.generation.indexed, true);
  assert.equal(response.body.download.available, true);
  assert.equal(response.body.usage.generatedDocuments, 1);
  assert.equal("objectKey" in response.body.document, false);
  assert.equal(JSON.stringify(response.body).includes("demo-sessions/demo_123"), false);
});

test("generated document route returns JSON validation errors", async () => {
  installRouteDependencies();

  const empty = await request(app)
    .post("/api/chats/chat_1/generated-documents")
    .set("x-demo-session-id", "demo_123")
    .send({ instruction: "" })
    .expect(400);
  assert.equal(empty.body.error.code, "GENERATED_DOCUMENT_INSTRUCTION_EMPTY");

  const unsupported = await request(app)
    .post("/api/chats/chat_1/generated-documents")
    .set("x-demo-session-id", "demo_123")
    .send({ instruction: "Create brief", filename: "brief.pdf" })
    .expect(400);
  assert.equal(unsupported.body.error.code, "GENERATED_DOCUMENT_UNSUPPORTED_FORMAT");
});

test("generated document route enforces generated document limit and chat messages", async () => {
  installRouteDependencies({ sessionUsage: { generatedDocuments: 3 } });
  const limit = await request(app)
    .post("/api/chats/chat_1/generated-documents")
    .set("x-demo-session-id", "demo_123")
    .send({ instruction: "Create brief", filename: "brief.md" })
    .expect(409);
  assert.equal(limit.body.error.code, "GENERATED_DOCUMENT_LIMIT_REACHED");

  installRouteDependencies({ messages: [] });
  const noMessages = await request(app)
    .post("/api/chats/chat_1/generated-documents")
    .set("x-demo-session-id", "demo_123")
    .send({ instruction: "Create brief", filename: "brief.md" })
    .expect(409);
  assert.equal(noMessages.body.error.code, "CHAT_HAS_NO_MESSAGES");
});
