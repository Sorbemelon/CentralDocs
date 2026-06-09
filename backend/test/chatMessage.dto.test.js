import { test } from "node:test";
import assert from "node:assert/strict";

const { toChatMessageDto } = await import("../src/services/chats/chatMessage.dto.js");

test("chat message DTO hides object keys, embeddings, local paths, and internals", () => {
  const dto = toChatMessageDto({
    _id: "message_1",
    __v: 4,
    chatSessionId: "chat_1",
    demoSessionId: "demo_secret",
    role: "user",
    content: "What are the rollout risks?",
    status: "complete",
    attachedDocumentSnapshot: [
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
        objectKey: "mock/secret",
        embedding: [0.1],
        localPath: "D:/secret/file.pptx",
      },
    ],
    attachedFolderSnapshot: [
      {
        id: "folder_1",
        name: "Strategy",
        scope: "mock",
        path: "/Strategy",
        readOnly: true,
        lifecycleStatus: "active",
        objectKey: "mock/secret",
      },
    ],
    resolvedDocumentSnapshot: [
      {
        id: "doc_1",
        title: "Rollout Plan",
        fileKind: "pptx",
        sourceType: "mock",
        scope: "mock",
        folderId: "folder_1",
        folderName: "Strategy",
        resolvedFromFolderIds: ["folder_1"],
        status: "ready",
        lifecycleStatus: "active",
        embedding: [0.1],
      },
    ],
    referencesUsed: [],
    aiMeta: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  });
  const serialized = JSON.stringify(dto);

  assert.equal(dto.role, "user");
  assert.deepEqual(dto.referencesUsed, []);
  assert.equal(dto.aiMeta, null);
  assert.equal(serialized.includes("objectKey"), false);
  assert.equal(serialized.includes("embedding"), false);
  assert.equal(serialized.includes("localPath"), false);
  assert.equal(serialized.includes("demo_secret"), false);
  assert.equal("__v" in dto, false);
});
