import { test } from "node:test";
import assert from "node:assert/strict";

const { createMemoryChatMessageRepository } = await import(
  "../src/services/chats/chatMessage.repository.js"
);

test("memory chat message repository creates and orders messages by chat session", async () => {
  const repository = createMemoryChatMessageRepository({
    seed: [
      {
        id: "message_old",
        chatSessionId: "chat_1",
        demoSessionId: "demo_123",
        role: "user",
        content: "Older",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: "message_other",
        chatSessionId: "chat_other",
        demoSessionId: "demo_123",
        role: "user",
        content: "Other",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ],
    now: () => new Date("2026-01-02T00:00:00.000Z"),
  });

  await repository.createMessage({
    chatSessionId: "chat_1",
    demoSessionId: "demo_123",
    role: "user",
    content: "Newer",
    status: "complete",
    referencesUsed: [],
    aiMeta: null,
  });
  const messages = await repository.listMessagesByChatSession({
    chatSessionId: "chat_1",
    demoSessionId: "demo_123",
  });

  assert.deepEqual(messages.map((message) => message.content), ["Older", "Newer"]);
  assert.equal(
    await repository.countMessagesByChatSession({
      chatSessionId: "chat_1",
      demoSessionId: "demo_123",
    }),
    2,
  );
  assert.equal(messages.every((message) => message.demoSessionId === "demo_123"), true);
});
