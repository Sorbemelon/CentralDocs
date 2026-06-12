import { test } from "node:test";
import assert from "node:assert/strict";

const { createChatMessageWithRagAnswer, createUserChatMessage } = await import(
  "../src/services/chats/chatMessage.service.js"
);
const { createMemoryChatMessageRepository } = await import(
  "../src/services/chats/chatMessage.repository.js"
);
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

function dependencies() {
  const chatSessionRepository = createMemoryChatSessionRepository({
    seed: [
      {
        id: "chat_1",
        demoSessionId: "demo_123",
        title: "Rollout risks",
        currentSelectedDocumentIds: ["doc_1"],
        currentSelectedFolderIds: ["folder_1"],
        aiPromptCount: 0,
      },
    ],
    now: () => new Date("2026-01-01T00:00:00.000Z"),
  });
  const chatMessageRepository = createMemoryChatMessageRepository({
    now: () => new Date("2026-01-02T00:00:00.000Z"),
  });

  return {
    chatSessionRepository,
    chatMessageRepository,
    selectionRepositories: selectionRepositories(),
    semanticSearcher: async () => ({
      references: [
        {
          citationNumber: 1,
          documentId: "doc_1",
          documentTitle: "Rollout Plan",
          fileType: "pptx",
          folderName: "Strategy",
          chunkId: "chunk_1",
          excerptPreview: "Training adoption is a risk.",
          similarityScore: 0.9,
        },
      ],
      results: [],
      scope: {},
    }),
    generator: async () => ({
      text: "Training adoption is the key rollout risk [1].",
      model: "gemini-3.5-flash",
      fallbackUsed: false,
      fallbackLevel: 0,
      keySlot: 0,
      latencyMs: 10,
      usage: { estimatedInputTokens: 100, estimatedOutputTokens: 20 },
      aiRouting: [],
    }),
    now: () => new Date("2026-01-03T00:00:00.000Z"),
  };
}

test("user message creation uses current selection and does not create assistant output", async () => {
  const deps = dependencies();
  const result = await createUserChatMessage({
    chatId: "chat_1",
    demoSessionId: "demo_123",
    body: { content: "What are the rollout risks?" },
    dependencies: deps,
  });

  assert.equal(result.message.role, "user");
  assert.equal(result.message.status, "complete");
  assert.equal(result.message.attachedDocumentSnapshot[0].id, "doc_1");
  assert.equal(result.message.attachedFolderSnapshot[0].id, "folder_1");
  assert.equal(result.message.referencesUsed.length, 0);
  assert.equal(result.message.aiMeta, null);
  assert.equal(result.chat.messageCount, 1);
  assert.equal(result.chat.aiPromptCount, 0);
});

test("user message creation applies selection override and old snapshots remain unchanged", async () => {
  const deps = dependencies();
  const first = await createUserChatMessage({
    chatId: "chat_1",
    demoSessionId: "demo_123",
    body: { content: "Use current selection." },
    dependencies: deps,
  });
  const second = await createUserChatMessage({
    chatId: "chat_1",
    demoSessionId: "demo_123",
    body: {
      content: "Use override.",
      selectedDocumentIds: ["doc_2"],
      selectedFolderIds: [],
    },
    dependencies: deps,
  });
  const storedMessages = await deps.chatMessageRepository.listMessagesByChatSession({
    chatSessionId: "chat_1",
    demoSessionId: "demo_123",
  });

  assert.equal(first.message.attachedDocumentSnapshot[0].id, "doc_1");
  assert.equal(second.message.attachedDocumentSnapshot[0].id, "doc_2");
  assert.deepEqual(second.chat.currentSelectedDocumentIds, ["doc_2"]);
  assert.equal(storedMessages[0].attachedDocumentSnapshot[0].id, "doc_1");
});

test("user message creation enforces empty and max prompt length validation", async () => {
  const deps = dependencies();

  await assert.rejects(
    () =>
      createUserChatMessage({
        chatId: "chat_1",
        demoSessionId: "demo_123",
        body: { content: "   " },
        dependencies: deps,
      }),
    { code: "CHAT_MESSAGE_EMPTY" },
  );
  await assert.rejects(
    () =>
      createUserChatMessage({
        chatId: "chat_1",
        demoSessionId: "demo_123",
        body: { content: "x".repeat(1501) },
        dependencies: deps,
      }),
    { code: "CHAT_MESSAGE_TOO_LONG" },
  );
});

test("RAG chat message creation stores user and assistant messages with citations", async () => {
  const deps = dependencies();
  const result = await createChatMessageWithRagAnswer({
    chatId: "chat_1",
    demoSessionId: "demo_123",
    body: { content: "What are the rollout risks?" },
    dependencies: deps,
  });

  assert.equal(result.userMessage.role, "user");
  assert.equal(result.assistantMessage.role, "assistant");
  assert.equal(result.assistantMessage.content, "Training adoption is the key rollout risk [1].");
  assert.equal(result.assistantMessage.referencesUsed[0].citationNumber, 1);
  assert.equal(result.assistantMessage.aiMeta.actionType, "chat_answer");
  assert.equal(result.chat.messageCount, 2);
  assert.equal(result.chat.aiPromptCount, 1);
});

test("RAG chat message creation checks and records hidden IP prompt quota", async () => {
  const deps = dependencies();
  const hiddenCalls = [];
  const result = await createChatMessageWithRagAnswer({
    chatId: "chat_1",
    demoSessionId: "demo_123",
    quotaIdentity: { enabled: true, identityHash: "safe_hash" },
    body: { content: "What are the rollout risks?" },
    dependencies: {
      ...deps,
      hiddenQuotaGuard: async ({ quotaIdentity, delta }) => {
        hiddenCalls.push(["guard", quotaIdentity, delta]);
        return { status: "checked" };
      },
      hiddenQuotaUsageUpdater: async ({ quotaIdentity, delta }) => {
        hiddenCalls.push(["usage", quotaIdentity, delta]);
        return { status: "updated" };
      },
    },
  });

  assert.equal(result.assistantMessage.role, "assistant");
  assert.deepEqual(hiddenCalls, [
    ["guard", { enabled: true, identityHash: "safe_hash" }, { aiPrompts: 1 }],
    ["usage", { enabled: true, identityHash: "safe_hash" }, { aiPrompts: 1 }],
  ]);
});

test("RAG chat message creation blocks hidden IP prompt quota before saving messages", async () => {
  const deps = dependencies();
  let generatorCalled = false;
  const error = Object.assign(new Error("Demo usage limit reached for this period. Please try again later."), {
    statusCode: 429,
    code: "DEMO_IP_QUOTA_LIMIT_REACHED",
  });

  await assert.rejects(
    () =>
      createChatMessageWithRagAnswer({
        chatId: "chat_1",
        demoSessionId: "demo_123",
        quotaIdentity: { enabled: true, identityHash: "safe_hash" },
        body: { content: "What are the rollout risks?" },
        dependencies: {
          ...deps,
          hiddenQuotaGuard: async () => {
            throw error;
          },
          generator: async () => {
            generatorCalled = true;
          },
        },
      }),
    { code: "DEMO_IP_QUOTA_LIMIT_REACHED" },
  );

  const storedMessages = await deps.chatMessageRepository.listMessagesByChatSession({
    chatSessionId: "chat_1",
    demoSessionId: "demo_123",
  });
  assert.equal(generatorCalled, false);
  assert.equal(storedMessages.length, 0);
});

test("RAG chat message creation rejects no context before provider call", async () => {
  const deps = dependencies();
  let generatorCalled = false;
  deps.generator = async () => {
    generatorCalled = true;
  };

  await assert.rejects(
    () =>
      createChatMessageWithRagAnswer({
        chatId: "chat_1",
        demoSessionId: "demo_123",
        body: {
          content: "What are the rollout risks?",
          selectedDocumentIds: [],
          selectedFolderIds: [],
        },
        dependencies: deps,
      }),
    { code: "CHAT_CONTEXT_REQUIRED" },
  );
  assert.equal(generatorCalled, false);
});
