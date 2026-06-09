import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";
delete process.env.MONGODB_URI;

const { app } = await import("../src/app.js");
const {
  resetChatMessageDependenciesForTests,
  setChatMessageDependenciesForTests,
} = await import("../src/services/chats/chatMessage.service.js");
const { createMemoryChatMessageRepository } = await import(
  "../src/services/chats/chatMessage.repository.js"
);
const {
  resetChatSessionDependenciesForTests,
  setChatSessionDependenciesForTests,
} = await import("../src/services/chats/chatSession.service.js");
const { createMemoryChatSessionRepository } = await import(
  "../src/services/chats/chatSession.repository.js"
);

const documents = [
  {
    id: "doc_1",
    title: "Rollout Plan",
    fileKind: "pptx",
    sourceType: "mock",
    scope: "mock",
    folderId: "folder_1",
    folderName: "Strategy",
    status: "ready",
    lifecycleStatus: "active",
  },
  {
    id: "doc_2",
    title: "Risk Register",
    fileKind: "csv",
    sourceType: "mock",
    scope: "mock",
    folderId: "folder_2",
    folderName: "Operations",
    status: "ready",
    lifecycleStatus: "active",
  },
];

const folders = [
  {
    id: "folder_1",
    name: "Strategy",
    scope: "mock",
    path: "/Strategy",
    readOnly: true,
    lifecycleStatus: "active",
  },
  {
    id: "folder_2",
    name: "Operations",
    scope: "mock",
    path: "/Operations",
    readOnly: true,
    lifecycleStatus: "active",
  },
];

function selectionRepositories() {
  return {
    documentRepository: {
      listAttachableDocuments: async ({ selectedDocumentIds, selectedFolderIds }) =>
        documents.filter(
          (document) =>
            selectedDocumentIds.includes(document.id) ||
            selectedFolderIds.includes(document.folderId),
        ),
    },
    folderRepository: {
      listAttachableFolders: async ({ selectedFolderIds }) =>
        folders.filter((folder) => selectedFolderIds.includes(folder.id)),
    },
  };
}

function installFakeDependencies({ sessions = [], messages = [] } = {}) {
  const chatSessionRepository = createMemoryChatSessionRepository({ seed: sessions });
  const chatMessageRepository = createMemoryChatMessageRepository({ seed: messages });
  const dependencies = {
    chatSessionRepository,
    chatMessageRepository,
    selectionRepositories: selectionRepositories(),
    semanticSearcher: async () => ({
      references: [
        {
          citationNumber: 1,
          documentId: "doc_2",
          documentTitle: "Risk Register",
          fileType: "csv",
          folderName: "Operations",
          chunkId: "chunk_1",
          excerptPreview: "Approval ownership is the risk.",
          similarityScore: 0.91,
        },
      ],
      results: [],
      scope: {},
    }),
    generator: async () => ({
      text: "Approval ownership is the main change risk [1].",
      model: "gemini-3.5-flash",
      fallbackUsed: false,
      fallbackLevel: 0,
      keySlot: 0,
      latencyMs: 15,
      usage: { estimatedInputTokens: 100, estimatedOutputTokens: 20 },
      aiRouting: [],
    }),
  };

  setChatSessionDependenciesForTests(dependencies);
  setChatMessageDependenciesForTests(dependencies);
  return dependencies;
}

afterEach(() => {
  resetChatSessionDependenciesForTests();
  resetChatMessageDependenciesForTests();
});

test("GET /api/chats exists and returns safe persistence error without MongoDB", async () => {
  const response = await request(app)
    .get("/api/chats")
    .set("x-demo-session-id", "demo_123")
    .expect(503);

  assert.equal(response.body.error.code, "PERSISTENCE_NOT_CONFIGURED");
});

test("chat routes create, list, update selection, store user message, detail, and delete", async () => {
  installFakeDependencies();

  const created = await request(app)
    .post("/api/chats")
    .set("x-demo-session-id", "demo_123")
    .send({
      title: "  Rollout risks  ",
      selectedDocumentIds: ["doc_1"],
      selectedFolderIds: ["folder_1"],
    })
    .expect(201);
  const chatId = created.body.chat.id;

  assert.equal(created.body.chat.title, "Rollout risks");
  assert.deepEqual(created.body.chat.currentSelectedDocumentIds, ["doc_1"]);

  const listed = await request(app)
    .get("/api/chats")
    .set("x-demo-session-id", "demo_123")
    .expect(200);
  assert.equal(listed.body.chats.length, 1);
  assert.equal(listed.body.remaining.chatSessions, 4);

  const renamed = await request(app)
    .patch(`/api/chats/${chatId}`)
    .set("x-demo-session-id", "demo_123")
    .send({ title: "Renamed chat", archived: true })
    .expect(200);
  assert.equal(renamed.body.chat.title, "Renamed chat");
  assert.ok(renamed.body.chat.archivedAt);

  const selection = await request(app)
    .patch(`/api/chats/${chatId}/selection`)
    .set("x-demo-session-id", "demo_123")
    .send({ selectedDocumentIds: ["doc_2"], selectedFolderIds: ["folder_2"] })
    .expect(200);
  assert.deepEqual(selection.body.chat.currentSelectedDocumentIds, ["doc_2"]);
  assert.equal(selection.body.selection.resolvedDocuments.length, 1);

  const message = await request(app)
    .post(`/api/chats/${chatId}/messages`)
    .set("x-demo-session-id", "demo_123")
    .send({ content: "What changed?" })
    .expect(201);
  assert.equal(message.body.userMessage.role, "user");
  assert.equal(message.body.userMessage.attachedDocumentSnapshot[0].id, "doc_2");
  assert.equal(message.body.assistantMessage.role, "assistant");
  assert.equal(message.body.assistantMessage.referencesUsed[0].citationNumber, 1);
  assert.equal(message.body.assistantMessage.aiMeta.generationModel, "gemini-3.5-flash");
  assert.equal(message.body.chat.aiPromptCount, 1);

  const detail = await request(app)
    .get(`/api/chats/${chatId}`)
    .set("x-demo-session-id", "demo_123")
    .expect(200);
  assert.equal(detail.body.messages.length, 2);
  assert.equal(detail.body.messages[0].role, "user");

  const deleted = await request(app)
    .delete(`/api/chats/${chatId}`)
    .set("x-demo-session-id", "demo_123")
    .expect(200);
  assert.equal(deleted.body.status, "trashed");
  assert.equal(deleted.body.chat.lifecycleStatus, "trashed");
});

test("chat routes validate titles, session limit, and message body as JSON errors", async () => {
  installFakeDependencies();

  const titleResponse = await request(app)
    .post("/api/chats")
    .set("x-demo-session-id", "demo_123")
    .send({ title: "x".repeat(121) })
    .expect(400);
  assert.equal(titleResponse.body.error.code, "CHAT_TITLE_INVALID");

  installFakeDependencies({
    sessions: Array.from({ length: 5 }, (_, index) => ({
      id: `chat_${index}`,
      demoSessionId: "demo_123",
      title: `Chat ${index}`,
    })),
  });
  const limitResponse = await request(app)
    .post("/api/chats")
    .set("x-demo-session-id", "demo_123")
    .send({ title: "Overflow" })
    .expect(409);
  assert.equal(limitResponse.body.error.code, "CHAT_SESSION_LIMIT_REACHED");

  installFakeDependencies({
    sessions: [{ id: "chat_1", demoSessionId: "demo_123", title: "Chat" }],
  });
  const messageResponse = await request(app)
    .post("/api/chats/chat_1/messages")
    .set("x-demo-session-id", "demo_123")
    .send({ content: "x".repeat(1501) })
    .expect(400);
  assert.equal(messageResponse.body.error.code, "CHAT_MESSAGE_TOO_LONG");
});

test("chat message route handles no selected context and AI prompt limit safely", async () => {
  installFakeDependencies({
    sessions: [{ id: "chat_empty", demoSessionId: "demo_123", title: "Empty" }],
  });
  const noContext = await request(app)
    .post("/api/chats/chat_empty/messages")
    .set("x-demo-session-id", "demo_123")
    .send({ content: "What are the risks?" })
    .expect(400);
  assert.equal(noContext.body.error.code, "CHAT_CONTEXT_REQUIRED");

  installFakeDependencies({
    sessions: [
      {
        id: "chat_limited",
        demoSessionId: "demo_123",
        title: "Limited",
        currentSelectedDocumentIds: ["doc_2"],
        aiPromptCount: 10,
      },
    ],
  });
  const limited = await request(app)
    .post("/api/chats/chat_limited/messages")
    .set("x-demo-session-id", "demo_123")
    .send({ content: "What are the risks?" })
    .expect(409);
  assert.equal(limited.body.error.code, "AI_PROMPT_LIMIT_REACHED");
});

test("chat routes require a demo session and generated-document route remains absent", async () => {
  installFakeDependencies();

  const response = await request(app).get("/api/chats").expect(401);
  assert.equal(response.body.error.code, "SESSION_NOT_FOUND");

  await request(app)
    .post("/api/chats/chat_1/generated-documents")
    .set("x-demo-session-id", "demo_123")
    .expect(404);
});
