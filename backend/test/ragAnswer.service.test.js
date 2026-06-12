import { test } from "node:test";
import assert from "node:assert/strict";

const { answerChatMessageWithRag } = await import("../src/services/rag/ragAnswer.service.js");
const { createMemoryChatMessageRepository } = await import(
  "../src/services/chats/chatMessage.repository.js"
);
const { createMemoryChatSessionRepository } = await import(
  "../src/services/chats/chatSession.repository.js"
);

function baseContext({ references = true } = {}) {
  return {
    hasOverride: false,
    selection: {
      selectedDocumentIds: ["doc_1"],
      selectedFolderIds: [],
      resolvedDocuments: [{ id: "doc_1", title: "Rollout Plan", fileKind: "pptx" }],
      snapshots: {
        attachedDocumentSnapshot: [{ id: "doc_1", title: "Rollout Plan" }],
        attachedFolderSnapshot: [],
        resolvedDocumentSnapshot: [{ id: "doc_1", title: "Rollout Plan" }],
      },
    },
    references: references
      ? [
          {
            citationNumber: 1,
            documentId: "doc_1",
            documentTitle: "Rollout Plan",
            fileType: "pptx",
            folderName: "Strategy",
            chunkId: "chunk_1",
            excerptPreview: "Training adoption is a risk.",
            similarityScore: 0.91,
            usedFor: "chat answer evidence",
          },
        ]
      : [],
    results: [],
    scope: {},
  };
}

function dependencies({ aiPromptCount = 0 } = {}) {
  const chatSessionRepository = createMemoryChatSessionRepository({
    seed: [
      {
        id: "chat_1",
        demoSessionId: "demo_123",
        title: "Chat",
        currentSelectedDocumentIds: ["doc_1"],
        messageCount: 1,
        aiPromptCount,
      },
    ],
  });
  const chatMessageRepository = createMemoryChatMessageRepository({
    seed: [
      {
        id: "message_user",
        chatSessionId: "chat_1",
        demoSessionId: "demo_123",
        role: "user",
        content: "What are the risks?",
      },
    ],
  });

  return { chatSessionRepository, chatMessageRepository };
}

test("RAG answer service generates and stores assistant answer with references and aiMeta", async () => {
  const deps = dependencies();
  const result = await answerChatMessageWithRag({
    chatId: "chat_1",
    demoSessionId: "demo_123",
    content: "What are the risks?",
    userMessage: { _id: "message_user", chatSessionId: "chat_1", demoSessionId: "demo_123", role: "user", content: "What are the risks?", status: "complete" },
    chatSession: { _id: "chat_1", demoSessionId: "demo_123", currentSelectedDocumentIds: ["doc_1"], aiPromptCount: 0, messageCount: 1 },
    ragContext: baseContext(),
    dependencies: {
      ...deps,
      historyLoader: async () => ({ rollingSummary: null, recentMessages: [] }),
      generator: async () => ({
        text: "Training adoption is the main risk [1].",
        model: "gemini-3.5-flash",
        fallbackUsed: false,
        fallbackLevel: 0,
        keySlot: 0,
        latencyMs: 12,
        usage: { estimatedInputTokens: 100, estimatedOutputTokens: 20 },
        aiRouting: [],
      }),
    },
  });

  assert.equal(result.userMessage.role, "user");
  assert.equal(result.assistantMessage.role, "assistant");
  assert.equal(result.assistantMessage.referencesUsed[0].usedFor, "chat answer evidence");
  assert.equal(result.assistantMessage.aiMeta.actionType, "chat_answer");
  assert.equal(result.assistantMessage.aiMeta.generationModel, "gemini-3.5-flash");
  assert.equal(result.chat.messageCount, 2);
  assert.equal(result.chat.aiPromptCount, 1);
  assert.equal(result.usage.aiPrompts, 1);
});

test("RAG answer service saves no-evidence assistant response without provider call", async () => {
  const deps = dependencies();
  let generatorCalled = false;
  const result = await answerChatMessageWithRag({
    chatId: "chat_1",
    demoSessionId: "demo_123",
    content: "Question",
    userMessage: { _id: "message_user", chatSessionId: "chat_1", demoSessionId: "demo_123", role: "user", content: "Question", status: "complete" },
    chatSession: { _id: "chat_1", demoSessionId: "demo_123", currentSelectedDocumentIds: ["doc_1"], aiPromptCount: 0, messageCount: 1 },
    ragContext: baseContext({ references: false }),
    dependencies: {
      ...deps,
      generator: async () => {
        generatorCalled = true;
      },
    },
  });

  assert.equal(generatorCalled, false);
  assert.equal(result.assistantMessage.role, "assistant");
  assert.equal(result.assistantMessage.aiMeta, null);
  assert.equal(result.references.length, 0);
  assert.equal(result.chat.aiPromptCount, 0);
});

test("RAG answer service enforces AI prompt limit before provider call", async () => {
  const deps = dependencies({ aiPromptCount: 10 });
  let generatorCalled = false;

  await assert.rejects(
    () =>
      answerChatMessageWithRag({
        chatId: "chat_1",
        demoSessionId: "demo_123",
        content: "Question",
        userMessage: { _id: "message_user", chatSessionId: "chat_1", demoSessionId: "demo_123", role: "user", content: "Question", status: "complete" },
        chatSession: { _id: "chat_1", demoSessionId: "demo_123", currentSelectedDocumentIds: ["doc_1"], aiPromptCount: 10, messageCount: 1 },
        ragContext: baseContext(),
        dependencies: {
          ...deps,
          generator: async () => {
            generatorCalled = true;
          },
        },
      }),
    { code: "AI_PROMPT_LIMIT_REACHED" },
  );
  assert.equal(generatorCalled, false);
});

test("RAG answer service rolls back accepted user message on provider failure", async () => {
  const deps = dependencies();
  const hiddenUsageUpdates = [];

  await assert.rejects(
    () =>
      answerChatMessageWithRag({
        chatId: "chat_1",
        demoSessionId: "demo_123",
        content: "Question",
        userMessage: { _id: "message_user", chatSessionId: "chat_1", demoSessionId: "demo_123", role: "user", content: "Question", status: "complete" },
        chatSession: { _id: "chat_1", demoSessionId: "demo_123", currentSelectedDocumentIds: ["doc_1"], aiPromptCount: 0, messageCount: 1 },
        ragContext: baseContext(),
        dependencies: {
          ...deps,
          historyLoader: async () => ({ rollingSummary: null, recentMessages: [] }),
          quotaIdentity: { enabled: true, identityHash: "safe_hash" },
          hiddenQuotaUsageUpdater: async ({ quotaIdentity, delta }) => {
            hiddenUsageUpdates.push({ quotaIdentity, delta });
            return { status: "updated" };
          },
          generator: async () => {
            throw new Error("provider exploded with unsafe details");
          },
        },
      }),
    { code: "RAG_ANSWER_FAILED" },
  );

  const messages = await deps.chatMessageRepository.listMessagesByChatSession({
    chatSessionId: "chat_1",
    demoSessionId: "demo_123",
  });
  const chat = deps.chatSessionRepository._unsafeSnapshot()[0];

  assert.equal(messages.length, 0);
  assert.equal(chat.messageCount, 0);
  assert.equal(chat.aiPromptCount, 1);
  assert.deepEqual(hiddenUsageUpdates, [
    {
      quotaIdentity: { enabled: true, identityHash: "safe_hash" },
      delta: { aiPrompts: 1 },
    },
  ]);
});
