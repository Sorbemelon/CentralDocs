import { test } from "node:test";
import assert from "node:assert/strict";

const { LIFECYCLE_STATUS } = await import("../src/constants/lifecycle.constants.js");
const {
  buildUniqueChatTitle,
  createSavedChatSession,
  deleteSavedChatSession,
  getSavedChatSessionDetail,
  listSavedChatSessions,
  updateSavedChatSession,
} = await import("../src/services/chats/chatSession.service.js");
const { createMemoryChatMessageRepository } = await import(
  "../src/services/chats/chatMessage.repository.js"
);
const { createMemoryChatSessionRepository } = await import(
  "../src/services/chats/chatSession.repository.js"
);
const { toChatMessageDtos } = await import("../src/services/chats/chatMessage.dto.js");
const { applyUsageDelta } = await import("../src/services/demo/demoUsage.service.js");

function fakeSelectionResolver({ selectedDocumentIds = [], selectedFolderIds = [] } = {}) {
  const docIds = [...new Set((selectedDocumentIds || []).map(String))];
  const folderIds = [...new Set((selectedFolderIds || []).map(String))];

  return {
    selectedDocumentIds: docIds,
    selectedFolderIds: folderIds,
    attachedDocuments: docIds.map((id) => ({ id, title: id })),
    attachedFolders: folderIds.map((id) => ({ id, name: id })),
    resolvedDocuments: docIds.map((id) => ({ id, title: id })),
    snapshots: {
      attachedDocumentSnapshot: docIds.map((id) => ({ id, title: id })),
      attachedFolderSnapshot: folderIds.map((id) => ({ id, name: id })),
      resolvedDocumentSnapshot: docIds.map((id) => ({ id, title: id })),
    },
  };
}

function dependencies({ sessions = [], messages = [], usage = {} } = {}) {
  const chatSessionRepository = createMemoryChatSessionRepository({ seed: sessions });
  const chatMessageRepository = createMemoryChatMessageRepository({ seed: messages });
  const usageSession = {
    sessionId: "demo_123",
    usage: {
      uploadedFiles: 0,
      chatSessions: 0,
      aiPrompts: 0,
      generatedDocuments: 0,
      userFolders: 0,
      storageBytes: 0,
      ...usage,
    },
  };
  const usageUpdates = [];

  return {
    chatSessionRepository,
    chatMessageRepository,
    messageDtoMapper: toChatMessageDtos,
    selectionResolver: fakeSelectionResolver,
    demoSessionReader: async () => usageSession,
    demoSessionUsageUpdater: async (sessionId, delta) => {
      usageUpdates.push({ sessionId, delta });
      Object.assign(usageSession, applyUsageDelta(usageSession, delta));
      return usageSession;
    },
    usageSession,
    usageUpdates,
  };
}

test("chat session service creates sessions with selected context and enforces max sessions", async () => {
  const deps = dependencies();
  const created = await createSavedChatSession({
    demoSessionId: "demo_123",
    body: {
      title: "  Rollout risks  ",
      selectedDocumentIds: ["doc_1"],
      selectedFolderIds: ["folder_1"],
    },
    dependencies: deps,
  });

  assert.equal(created.chat.title, "Rollout risks");
  assert.deepEqual(created.chat.currentSelectedDocumentIds, ["doc_1"]);
  assert.deepEqual(created.selection.selectedFolderIds, ["folder_1"]);

  const fullDeps = dependencies({
    sessions: Array.from({ length: 5 }, (_, index) => ({
      id: `chat_${index}`,
      demoSessionId: "demo_123",
      title: `Chat ${index}`,
    })),
  });

  await assert.rejects(
    () =>
      createSavedChatSession({
        demoSessionId: "demo_123",
        body: { title: "Overflow" },
        dependencies: fullDeps,
      }),
    { code: "CHAT_SESSION_LIMIT_REACHED" },
  );

  const usageFullDeps = dependencies({ usage: { chatSessions: 5 } });
  await assert.rejects(
    () =>
      createSavedChatSession({
        demoSessionId: "demo_123",
        body: { title: "Usage full" },
        dependencies: usageFullDeps,
      }),
    { code: "CHAT_SESSION_LIMIT_REACHED" },
  );

});

test("chat session service gives duplicate chat titles a numeric suffix", async () => {
  assert.equal(
    buildUniqueChatTitle("New chat", [
      { id: "chat_1", title: "New chat" },
      { id: "chat_2", title: "New chat (2)" },
    ]),
    "New chat (3)",
  );

  const createDeps = dependencies({
    sessions: [
      { id: "chat_1", demoSessionId: "demo_123", title: "New chat" },
      { id: "chat_2", demoSessionId: "demo_123", title: "New chat (2)" },
    ],
  });
  const created = await createSavedChatSession({
    demoSessionId: "demo_123",
    body: {},
    dependencies: createDeps,
  });

  assert.equal(created.chat.title, "New chat (3)");

  const renameDeps = dependencies({
    sessions: [
      { id: "chat_a", demoSessionId: "demo_123", title: "Planning" },
      { id: "chat_b", demoSessionId: "demo_123", title: "Research" },
    ],
  });
  const renamed = await updateSavedChatSession({
    chatId: "chat_a",
    demoSessionId: "demo_123",
    body: { title: "Research" },
    dependencies: renameDeps,
  });

  assert.equal(renamed.chat.title, "Research (2)");
});

test("chat session service lists current demo sessions and counts active archived trashed", async () => {
  const deps = dependencies({
    sessions: [
      { id: "chat_active", demoSessionId: "demo_123", title: "Active" },
      {
        id: "chat_archived",
        demoSessionId: "demo_123",
        title: "Archived",
        archivedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: "chat_trashed",
        demoSessionId: "demo_123",
        title: "Trashed",
        lifecycleStatus: LIFECYCLE_STATUS.TRASHED,
      },
      { id: "chat_other", demoSessionId: "demo_other", title: "Other" },
    ],
  });
  const result = await listSavedChatSessions({
    demoSessionId: "demo_123",
    dependencies: deps,
  });

  assert.deepEqual(result.counts, { active: 1, archived: 1, trashed: 1 });
  assert.equal(result.chats.length, 2);
  assert.equal(result.remaining.chatSessions, 3);
});

test("chat session service returns detail with ordered messages and supports rename/archive/delete", async () => {
  const deps = dependencies({
    sessions: [{ id: "chat_1", demoSessionId: "demo_123", title: "Original" }],
    messages: [
      {
        id: "message_1",
        chatSessionId: "chat_1",
        demoSessionId: "demo_123",
        role: "user",
        content: "Hello",
      },
    ],
  });

  const detail = await getSavedChatSessionDetail({
    chatId: "chat_1",
    demoSessionId: "demo_123",
    dependencies: deps,
  });
  const renamed = await updateSavedChatSession({
    chatId: "chat_1",
    demoSessionId: "demo_123",
    body: { title: "Renamed", archived: true },
    dependencies: deps,
  });
  const trashed = await deleteSavedChatSession({
    chatId: "chat_1",
    demoSessionId: "demo_123",
    dependencies: deps,
  });

  assert.equal(detail.messages.length, 1);
  assert.equal(renamed.chat.title, "Renamed");
  assert.ok(renamed.chat.archivedAt);
  assert.equal(trashed.chat.lifecycleStatus, LIFECYCLE_STATUS.TRASHED);
});

test("chat session service increments and decrements usage on create and delete", async () => {
  const deps = dependencies({ usage: { chatSessions: 1 } });
  const created = await createSavedChatSession({
    demoSessionId: "demo_123",
    body: { title: "Tracked" },
    dependencies: deps,
  });
  const deleted = await deleteSavedChatSession({
    chatId: created.chat.id,
    demoSessionId: "demo_123",
    dependencies: deps,
  });

  assert.deepEqual(deps.usageUpdates.map((entry) => entry.delta), [
    { chatSessions: 1 },
    { chatSessions: -1 },
  ]);
  assert.equal(created.usage.chatSessions, 2);
  assert.equal(deleted.usage.chatSessions, 1);
  assert.equal(deps.usageSession.usage.chatSessions, 1);
});
