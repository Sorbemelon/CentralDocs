import { test } from "node:test";
import assert from "node:assert/strict";

const { generateDocumentFromChat } = await import(
  "../src/services/generatedDocuments/generatedDocument.service.js"
);
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
const { createHttpError } = await import("../src/utils/httpError.js");

function baseMessages() {
  return [
    {
      id: "message_user",
      chatSessionId: "chat_1",
      demoSessionId: "demo_123",
      role: "user",
      content: "What are the rollout risks?",
    },
    {
      id: "message_assistant",
      chatSessionId: "chat_1",
      demoSessionId: "demo_123",
      role: "assistant",
      content: "Approval ownership is the main risk [1].",
      referencesUsed: [
        {
          citationNumber: 1,
          documentId: "mock_doc_1",
          documentTitle: "Risk Register",
          fileType: "csv",
          folderName: "Operations",
          chunkId: "chunk_1",
          excerptPreview: "Approval owner is missing.",
        },
      ],
    },
  ];
}

function dependencies({
  messages = baseMessages(),
  sessionUsage = {},
  generatedSeed = [],
  generatedOutput = "# Brief\n\nApproval ownership is the main risk.",
  indexer,
  storageSaver,
  generator,
  hiddenQuotaGuard,
  hiddenQuotaUsageUpdater,
} = {}) {
  const generatedDocumentRepository = createMemoryGeneratedDocumentRepository({ seed: generatedSeed });
  const chatSessionRepository = createMemoryChatSessionRepository({
    seed: [
      {
        id: "chat_1",
        demoSessionId: "demo_123",
        title: "Rollout risks",
        currentSelectedDocumentIds: ["mock_doc_1"],
        currentSelectedFolderIds: ["mock_folder_1"],
      },
    ],
  });
  const chatMessageRepository = createMemoryChatMessageRepository({ seed: messages });
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
    deps: {
      chatSessionRepository,
      chatMessageRepository,
      generatedDocumentRepository,
      selectionResolver: async () => ({
        selectedDocumentIds: ["mock_doc_1"],
        selectedFolderIds: ["mock_folder_1"],
        resolvedDocuments: [{ id: "mock_doc_1", title: "Risk Register", fileKind: "csv" }],
        snapshots: {
          attachedDocumentSnapshot: [{ id: "mock_doc_1", title: "Risk Register" }],
          attachedFolderSnapshot: [{ id: "mock_folder_1", name: "Operations" }],
          resolvedDocumentSnapshot: [{ id: "mock_doc_1", title: "Risk Register" }],
        },
      }),
      generator:
        generator ||
        (async () => ({
          text: generatedOutput,
          model: "gemini-3.5-flash",
          fallbackUsed: false,
          fallbackLevel: 0,
          keySlot: 0,
          latencyMs: 10,
          usage: { estimatedInputTokens: 50, estimatedOutputTokens: 10 },
          warnings: [],
        })),
      storageSaver:
        storageSaver ||
        (async ({ demoSessionId, documentId, filename }) => ({
          objectKey: `demo-sessions/${demoSessionId}/generated/${documentId}/${filename}`,
          storageProvider: "s3",
        })),
      indexer:
        indexer ||
        (async () => ({
          indexed: true,
          contentStats: {
            extractedCharCount: 44,
            optimizedCharCount: 44,
            estimatedTokenCount: 11,
            chunkCount: 1,
          },
          warnings: [],
        })),
      demoSessionReader: async () => usageSession,
      demoSessionUsageUpdater: async (sessionId, delta) => {
        usageUpdates.push({ sessionId, delta });
        Object.assign(usageSession, applyUsageDelta(usageSession, delta));
        return usageSession;
      },
      hiddenQuotaGuard: hiddenQuotaGuard || (async () => ({ status: "skipped" })),
      hiddenQuotaUsageUpdater: hiddenQuotaUsageUpdater || (async () => ({ status: "skipped" })),
    },
    generatedDocumentRepository,
    chatSessionRepository,
    chatMessageRepository,
    usageUpdates,
  };
}

test("generated document service creates saved downloadable generated document", async () => {
  const ctx = dependencies();
  const result = await generateDocumentFromChat({
    chatId: "chat_1",
    demoSessionId: "demo_123",
    body: {
      instruction: "Create a concise internal briefing.",
      filename: "orchid-rollout-brief.md",
      includeReferences: true,
      includeCurrentSelectedDocuments: true,
    },
    dependencies: ctx.deps,
  });

  assert.equal(result.document.sourceType, "generated");
  assert.equal(result.document.scope, "generated");
  assert.equal(result.document.downloadFilename, "orchid-rollout-brief.md");
  assert.equal(result.document.downloadAvailable, true);
  assert.equal(result.document.generatedMeta.referencesIncluded, true);
  assert.deepEqual(result.document.generatedMeta.sourceDocumentIds, ["mock_doc_1"]);
  assert.equal(result.generation.model, "gemini-3.5-flash");
  assert.equal(result.generation.indexed, true);
  assert.equal(result.usage.generatedDocuments, 1);
  assert.equal(result.remaining.generatedDocuments, 2);
  assert.equal(ctx.usageUpdates.length, 1);
  assert.equal(ctx.chatMessageRepository._unsafeSnapshot().length, 2);
  assert.deepEqual(
    ctx.chatSessionRepository._unsafeSnapshot()[0].currentSelectedDocumentIds,
    ["mock_doc_1"],
  );
});

test("generated document service accepts empty instruction with default and validates filename and chat messages", async () => {
  const ctx = dependencies();
  const defaultInstruction = await generateDocumentFromChat({
    chatId: "chat_1",
    demoSessionId: "demo_123",
    body: { instruction: "", filename: "brief.md" },
    dependencies: ctx.deps,
  });
  assert.match(defaultInstruction.document.generatedMeta.generationInstruction, /Summarize this chat/i);

  await assert.rejects(
    () =>
      generateDocumentFromChat({
        chatId: "chat_1",
        demoSessionId: "demo_123",
        body: { instruction: "x".repeat(2001), filename: "brief.md" },
        dependencies: ctx.deps,
      }),
    { code: "GENERATED_DOCUMENT_INSTRUCTION_TOO_LONG" },
  );
  await assert.rejects(
    () =>
      generateDocumentFromChat({
        chatId: "chat_1",
        demoSessionId: "demo_123",
        body: { instruction: "Create brief", filename: "brief.docx" },
        dependencies: ctx.deps,
      }),
    { code: "GENERATED_DOCUMENT_UNSUPPORTED_FORMAT" },
  );

  const emptyChat = dependencies({ messages: [] });
  await assert.rejects(
    () =>
      generateDocumentFromChat({
        chatId: "chat_1",
        demoSessionId: "demo_123",
        body: { instruction: "Create brief", filename: "brief.md" },
        dependencies: emptyChat.deps,
      }),
    { code: "CHAT_HAS_NO_MESSAGES" },
  );
});

test("generated document service checks and records hidden IP quota", async () => {
  const hiddenCalls = [];
  const generatedOutput = "# Brief\n\nA saved generated document.";
  const ctx = dependencies({
    generatedOutput,
    hiddenQuotaGuard: async ({ quotaIdentity, delta }) => {
      hiddenCalls.push(["guard", quotaIdentity, delta]);
      return { status: "checked" };
    },
    hiddenQuotaUsageUpdater: async ({ quotaIdentity, delta }) => {
      hiddenCalls.push(["usage", quotaIdentity, delta]);
      return { status: "updated" };
    },
  });

  await generateDocumentFromChat({
    chatId: "chat_1",
    demoSessionId: "demo_123",
    quotaIdentity: { enabled: true, identityHash: "safe_hash" },
    body: { filename: "summary.md" },
    dependencies: ctx.deps,
  });

  const sizeBytes = Buffer.byteLength(generatedOutput, "utf8");
  assert.deepEqual(hiddenCalls, [
    ["guard", { enabled: true, identityHash: "safe_hash" }, { generatedDocuments: 1 }],
    ["guard", { enabled: true, identityHash: "safe_hash" }, { generatedDocuments: 1, storageBytes: sizeBytes }],
    ["usage", { enabled: true, identityHash: "safe_hash" }, { generatedDocuments: 1, storageBytes: sizeBytes }],
  ]);
});

test("generated document service blocks hidden IP quota before provider generation", async () => {
  let generatorCalled = false;
  const error = Object.assign(new Error("Demo usage limit reached for this period. Please try again later."), {
    statusCode: 429,
    code: "DEMO_IP_QUOTA_LIMIT_REACHED",
  });
  const ctx = dependencies({
    hiddenQuotaGuard: async () => {
      throw error;
    },
    generator: async () => {
      generatorCalled = true;
      return { text: "# Should not happen" };
    },
  });

  await assert.rejects(
    () =>
      generateDocumentFromChat({
        chatId: "chat_1",
        demoSessionId: "demo_123",
        quotaIdentity: { enabled: true, identityHash: "safe_hash" },
        body: { filename: "summary.md" },
        dependencies: ctx.deps,
      }),
    { code: "DEMO_IP_QUOTA_LIMIT_REACHED" },
  );

  assert.equal(generatorCalled, false);
  assert.equal(ctx.usageUpdates.length, 0);
});

test("generated document service defaults to a unique summary filename", async () => {
  const ctx = dependencies({
    generatedSeed: [
      {
        id: "generated_existing",
        demoSessionId: "demo_123",
        scope: "generated",
        sourceType: "generated",
        lifecycleStatus: "active",
        originalFilename: "summary.md",
        downloadFilename: "summary.md",
      },
    ],
  });

  const result = await generateDocumentFromChat({
    chatId: "chat_1",
    demoSessionId: "demo_123",
    body: { instruction: "", filename: "" },
    dependencies: ctx.deps,
  });

  assert.equal(result.document.downloadFilename, "summary (2).md");
});

test("generated document service enforces generated-document and storage limits", async () => {
  const limited = dependencies({ sessionUsage: { generatedDocuments: 3 } });
  await assert.rejects(
    () =>
      generateDocumentFromChat({
        chatId: "chat_1",
        demoSessionId: "demo_123",
        body: { instruction: "Create brief", filename: "brief.md" },
        dependencies: limited.deps,
      }),
    { code: "GENERATED_DOCUMENT_LIMIT_REACHED" },
  );

  const tooLarge = dependencies({ generatedOutput: "x".repeat(1024 * 100 + 1) });
  await assert.rejects(
    () =>
      generateDocumentFromChat({
        chatId: "chat_1",
        demoSessionId: "demo_123",
        body: { instruction: "Create brief", filename: "brief.md" },
        dependencies: tooLarge.deps,
      }),
    { code: "GENERATED_DOCUMENT_TOO_LARGE" },
  );

  const storageLimited = dependencies({
    sessionUsage: { storageBytes: 20 * 1024 * 1024 - 5 },
    generatedOutput: "123456",
  });
  await assert.rejects(
    () =>
      generateDocumentFromChat({
        chatId: "chat_1",
        demoSessionId: "demo_123",
        body: { instruction: "Create brief", filename: "brief.md" },
        dependencies: storageLimited.deps,
      }),
    { code: "DEMO_STORAGE_LIMIT_REACHED" },
  );
});

test("generated document service handles provider, storage, and indexing failures safely", async () => {
  const providerFail = dependencies({
    generator: async () => {
      const error = new Error("provider failed");
      error.statusCode = 502;
      error.code = "GENERATION_PROVIDER_ERROR";
      throw error;
    },
  });
  await assert.rejects(
    () =>
      generateDocumentFromChat({
        chatId: "chat_1",
        demoSessionId: "demo_123",
        body: { instruction: "Create brief", filename: "brief.md" },
        dependencies: providerFail.deps,
      }),
    { code: "GENERATION_PROVIDER_ERROR" },
  );

  const storageFail = dependencies({
    storageSaver: async () => {
      const error = new Error("storage unavailable");
      error.statusCode = 503;
      error.code = "STORAGE_NOT_CONFIGURED";
      throw error;
    },
  });
  await assert.rejects(
    () =>
      generateDocumentFromChat({
        chatId: "chat_1",
        demoSessionId: "demo_123",
        body: { instruction: "Create brief", filename: "brief.md" },
        dependencies: storageFail.deps,
      }),
    { code: "STORAGE_NOT_CONFIGURED" },
  );
  assert.equal(storageFail.generatedDocumentRepository._unsafeSnapshot().length, 0);

  const indexingFail = dependencies({
    indexer: async () => ({
      indexed: false,
      warnings: [{ code: "GENERATED_DOCUMENT_INDEXING_FAILED" }],
    }),
  });
  const result = await generateDocumentFromChat({
    chatId: "chat_1",
    demoSessionId: "demo_123",
    body: { instruction: "Create brief", filename: "brief.md" },
    dependencies: indexingFail.deps,
  });
  assert.equal(result.generation.indexed, false);
  assert.deepEqual(result.generation.warnings, ["GENERATED_DOCUMENT_INDEXING_FAILED"]);
  assert.equal(result.document.statusMessage.includes("indexing"), true);

  const indexingThrow = dependencies({
    indexer: async () => {
      const error = new Error("provider stack trace should stay private");
      error.code = "EMBEDDING_PROVIDER_ERROR";
      throw error;
    },
  });
  const savedWithWarning = await generateDocumentFromChat({
    chatId: "chat_1",
    demoSessionId: "demo_123",
    body: { instruction: "Create brief", filename: "brief.md" },
    dependencies: indexingThrow.deps,
  });
  assert.equal(savedWithWarning.generation.indexed, false);
  assert.deepEqual(savedWithWarning.generation.warnings, ["GENERATED_DOCUMENT_INDEXING_FAILED"]);
  assert.equal(savedWithWarning.document.statusMessage.includes("indexing"), true);
  assert.equal(indexingThrow.generatedDocumentRepository._unsafeSnapshot().length, 1);
});

test("generated document service returns transient generation errors without saving a document", async () => {
  const providerUnavailable = dependencies({
    generator: async () => {
      throw createHttpError(
        503,
        "The AI generation provider is temporarily unavailable. Please try again.",
        "GENERATION_PROVIDER_UNAVAILABLE",
      );
    },
  });

  await assert.rejects(
    () =>
      generateDocumentFromChat({
        chatId: "chat_1",
        demoSessionId: "demo_123",
        body: { instruction: "", filename: "summary.md" },
        dependencies: providerUnavailable.deps,
      }),
    { code: "GENERATION_PROVIDER_UNAVAILABLE" },
  );

  assert.equal(providerUnavailable.generatedDocumentRepository._unsafeSnapshot().length, 0);
  assert.equal(providerUnavailable.usageUpdates.length, 0);
});
