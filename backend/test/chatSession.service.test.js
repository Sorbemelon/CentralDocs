import { test } from "node:test";
import assert from "node:assert/strict";

const { LIFECYCLE_STATUS } = await import("../src/constants/lifecycle.constants.js");
const {
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

function dependencies({ sessions = [], messages = [] } = {}) {
  const chatSessionRepository = createMemoryChatSessionRepository({ seed: sessions });
  const chatMessageRepository = createMemoryChatMessageRepository({ seed: messages });

  return {
    chatSessionRepository,
    chatMessageRepository,
    messageDtoMapper: toChatMessageDtos,
    selectionResolver: fakeSelectionResolver,
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
