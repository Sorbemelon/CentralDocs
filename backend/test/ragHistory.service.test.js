import { test } from "node:test";
import assert from "node:assert/strict";

const { loadRagHistory } = await import("../src/services/rag/ragHistory.service.js");

test("RAG history loads recent 8 messages and includes rolling summary", async () => {
  const messages = Array.from({ length: 10 }, (_, index) => ({
    chatSessionId: "chat_1",
    demoSessionId: "demo_123",
    role: index % 2 === 0 ? "user" : "assistant",
    status: "complete",
    content: `Message ${index}`,
    createdAt: new Date(`2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`),
    objectKey: "mock/secret",
    embedding: [0.1],
  }));
  messages.push({
    role: "assistant",
    status: "failed",
    content: "Failed response",
    createdAt: new Date("2026-01-20T00:00:00.000Z"),
  });

  const history = await loadRagHistory({
    chatSession: { rollingSummary: "Earlier discussion summary." },
    chatSessionId: "chat_1",
    demoSessionId: "demo_123",
    messageRepository: {
      listMessagesByChatSession: async () => messages,
    },
  });
  const serialized = JSON.stringify(history);

  assert.equal(history.rollingSummary, "Earlier discussion summary.");
  assert.equal(history.recentMessages.length, 8);
  assert.equal(history.recentMessages[0].content, "Message 2");
  assert.equal(serialized.includes("objectKey"), false);
  assert.equal(serialized.includes("embedding"), false);
  assert.equal(serialized.includes("Failed response"), false);
});
