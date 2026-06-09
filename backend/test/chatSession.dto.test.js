import { test } from "node:test";
import assert from "node:assert/strict";

const { toChatSessionDto } = await import("../src/services/chats/chatSession.dto.js");

test("chat session DTO hides Mongoose internals and reports selection counts", () => {
  const dto = toChatSessionDto(
    {
      _id: "chat_1",
      __v: 9,
      demoSessionId: "demo_secret",
      title: "Rollout risks",
      currentSelectedDocumentIds: ["doc_1", "doc_2"],
      currentSelectedFolderIds: ["folder_1"],
      rollingSummary: null,
      messageCount: 2,
      aiPromptCount: 0,
      archivedAt: null,
      lifecycleStatus: "active",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      lastMessageAt: new Date("2026-01-03T00:00:00.000Z"),
    },
    { resolvedDocumentCount: 3 },
  );

  assert.equal(dto.id, "chat_1");
  assert.equal(dto.currentSelectedDocumentCount, 2);
  assert.equal(dto.currentSelectedFolderCount, 1);
  assert.equal(dto.resolvedDocumentCount, 3);
  assert.equal("demoSessionId" in dto, false);
  assert.equal("__v" in dto, false);
});
