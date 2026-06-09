import { test } from "node:test";
import assert from "node:assert/strict";

const { LIFECYCLE_STATUS } = await import("../src/constants/lifecycle.constants.js");
const { createMemoryChatSessionRepository } = await import(
  "../src/services/chats/chatSession.repository.js"
);

test("memory chat session repository creates, lists, updates, and scopes by demo session", async () => {
  const repository = createMemoryChatSessionRepository({
    seed: [
      { id: "chat_other", demoSessionId: "demo_other", title: "Other" },
      { id: "chat_trashed", demoSessionId: "demo_123", title: "Old", lifecycleStatus: "trashed" },
    ],
    now: () => new Date("2026-01-01T00:00:00.000Z"),
  });

  const created = await repository.createChatSession({
    demoSessionId: "demo_123",
    title: "Rollout risks",
    selectedDocumentIds: ["doc_1"],
    selectedFolderIds: ["folder_1"],
  });
  const listed = await repository.listChatSessionsByDemoSession({
    demoSessionId: "demo_123",
    includeTrash: true,
  });

  assert.equal(created.title, "Rollout risks");
  assert.deepEqual(created.currentSelectedDocumentIds, ["doc_1"]);
  assert.equal(listed.length, 2);
  assert.equal(await repository.countActiveChatSessionsByDemoSession({ demoSessionId: "demo_123" }), 1);

  const renamed = await repository.updateChatSession({
    chatId: created._id,
    demoSessionId: "demo_123",
    patch: { title: "Renamed" },
  });
  const selected = await repository.updateSelection({
    chatId: created._id,
    demoSessionId: "demo_123",
    selectedDocumentIds: ["doc_2"],
    selectedFolderIds: [],
  });
  const incremented = await repository.incrementMessageCount({
    chatId: created._id,
    demoSessionId: "demo_123",
    at: new Date("2026-01-02T00:00:00.000Z"),
  });
  const trashed = await repository.softDeleteChatSession({
    chatId: created._id,
    demoSessionId: "demo_123",
  });

  assert.equal(renamed.title, "Renamed");
  assert.deepEqual(selected.currentSelectedDocumentIds, ["doc_2"]);
  assert.equal(incremented.messageCount, 1);
  assert.equal(trashed.lifecycleStatus, LIFECYCLE_STATUS.TRASHED);
  assert.equal(
    await repository.getChatSessionById({ chatId: created._id, demoSessionId: "demo_other" }),
    null,
  );
});
