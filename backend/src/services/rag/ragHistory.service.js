import { DEMO_LIMITS } from "../../config/limits.js";
import { CHAT_MESSAGE_STATUS } from "../../constants/chat.constants.js";

function serializeDate(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function toHistoryMessage(message = {}) {
  return {
    role: message.role,
    content: String(message.content || "").slice(0, 1500),
    createdAt: serializeDate(message.createdAt),
  };
}

export async function loadRagHistory({
  chatSession = {},
  chatSessionId,
  demoSessionId,
  messageRepository,
  recentLimit = DEMO_LIMITS.recentChatHistoryMessages,
} = {}) {
  const messages = messageRepository
    ? await messageRepository.listMessagesByChatSession({ chatSessionId, demoSessionId })
    : [];
  const usableMessages = messages.filter(
    (message) =>
      message.status !== CHAT_MESSAGE_STATUS.FAILED &&
      message.content &&
      (message.role === "user" || message.role === "assistant"),
  );

  return {
    rollingSummary: chatSession.rollingSummary || null,
    recentMessages: usableMessages.slice(-recentLimit).map((message) => toHistoryMessage(message)),
  };
}
