import { CHAT_MESSAGE_STATUS, CHAT_ROLE } from "../../constants/chat.constants.js";
import { CHAT_SESSION_ERROR_CODE } from "../../constants/chatSession.constants.js";
import { isMongoConnected } from "../../db/connectMongo.js";
import { ChatMessage } from "../../models/ChatMessage.model.js";
import { createHttpError } from "../../utils/httpError.js";

function requirePersistence() {
  if (!isMongoConnected()) {
    throw createHttpError(
      503,
      "MongoDB persistence is not configured or connected for chat messages.",
      CHAT_SESSION_ERROR_CODE.PERSISTENCE_NOT_CONFIGURED,
    );
  }
}

export async function createMessage({
  chatSessionId,
  demoSessionId,
  role,
  content,
  status = CHAT_MESSAGE_STATUS.COMPLETE,
  attachedDocumentSnapshot = [],
  attachedFolderSnapshot = [],
  resolvedDocumentSnapshot = [],
  referencesUsed = [],
  aiMeta = null,
} = {}) {
  requirePersistence();

  return ChatMessage.create({
    chatSessionId,
    demoSessionId,
    role,
    content,
    status,
    attachedDocumentSnapshot,
    attachedFolderSnapshot,
    resolvedDocumentSnapshot,
    referencesUsed,
    aiMeta,
  });
}

export async function listMessagesByChatSession({ chatSessionId, demoSessionId } = {}) {
  requirePersistence();

  return ChatMessage.find({ chatSessionId, demoSessionId }).sort({ createdAt: 1 }).lean();
}

export async function countMessagesByChatSession({ chatSessionId, demoSessionId } = {}) {
  requirePersistence();

  return ChatMessage.countDocuments({ chatSessionId, demoSessionId });
}

export async function softDeleteMessagesByChatSession() {
  return { status: "reserved_for_cleanup", modifiedCount: 0 };
}

export function createMemoryChatMessageRepository({ seed = [], now = () => new Date() } = {}) {
  const messages = new Map();
  let counter = 0;

  function clone(message) {
    return message
      ? {
          ...message,
          attachedDocumentSnapshot: [...message.attachedDocumentSnapshot],
          attachedFolderSnapshot: [...message.attachedFolderSnapshot],
          resolvedDocumentSnapshot: [...message.resolvedDocumentSnapshot],
          referencesUsed: [...message.referencesUsed],
        }
      : null;
  }

  for (const message of seed) {
    const id = String(message.id || message._id || `message_${++counter}`);
    messages.set(id, {
      _id: id,
      chatSessionId: String(message.chatSessionId),
      demoSessionId: message.demoSessionId,
      role: message.role || CHAT_ROLE.USER,
      content: message.content,
      status: message.status || CHAT_MESSAGE_STATUS.COMPLETE,
      attachedDocumentSnapshot: [...(message.attachedDocumentSnapshot || [])],
      attachedFolderSnapshot: [...(message.attachedFolderSnapshot || [])],
      resolvedDocumentSnapshot: [...(message.resolvedDocumentSnapshot || [])],
      referencesUsed: [...(message.referencesUsed || [])],
      aiMeta: message.aiMeta || null,
      createdAt: message.createdAt || now(),
    });
  }

  return {
    async createMessage(message) {
      const id = `message_${++counter}`;
      const created = {
        _id: id,
        chatSessionId: String(message.chatSessionId),
        demoSessionId: message.demoSessionId,
        role: message.role || CHAT_ROLE.USER,
        content: message.content,
        status: message.status || CHAT_MESSAGE_STATUS.COMPLETE,
        attachedDocumentSnapshot: [...(message.attachedDocumentSnapshot || [])],
        attachedFolderSnapshot: [...(message.attachedFolderSnapshot || [])],
        resolvedDocumentSnapshot: [...(message.resolvedDocumentSnapshot || [])],
        referencesUsed: [...(message.referencesUsed || [])],
        aiMeta: message.aiMeta || null,
        createdAt: now(),
      };
      messages.set(id, created);
      return clone(created);
    },
    async listMessagesByChatSession({ chatSessionId, demoSessionId }) {
      return [...messages.values()]
        .filter(
          (message) =>
            String(message.chatSessionId) === String(chatSessionId) &&
            message.demoSessionId === demoSessionId,
        )
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map(clone);
    },
    async countMessagesByChatSession({ chatSessionId, demoSessionId }) {
      return (
        await this.listMessagesByChatSession({ chatSessionId, demoSessionId })
      ).length;
    },
    async softDeleteMessagesByChatSession() {
      return { status: "reserved_for_cleanup", modifiedCount: 0 };
    },
    _unsafeSnapshot() {
      return [...messages.values()].map(clone);
    },
  };
}
