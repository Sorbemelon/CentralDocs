import mongoose from "mongoose";
import { LIFECYCLE_STATUS } from "../../constants/lifecycle.constants.js";
import { CHAT_SESSION_ERROR_CODE } from "../../constants/chatSession.constants.js";
import { isMongoConnected } from "../../db/connectMongo.js";
import { ChatSession } from "../../models/ChatSession.model.js";
import { createHttpError } from "../../utils/httpError.js";

function requirePersistence() {
  if (!isMongoConnected()) {
    throw createHttpError(
      503,
      "MongoDB persistence is not configured or connected for chat sessions.",
      CHAT_SESSION_ERROR_CODE.PERSISTENCE_NOT_CONFIGURED,
    );
  }
}

function activeFilter(includeTrash = false) {
  return includeTrash ? {} : { lifecycleStatus: LIFECYCLE_STATUS.ACTIVE };
}

function isValidMongoId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

export async function createChatSession({
  demoSessionId,
  title,
  selectedDocumentIds = [],
  selectedFolderIds = [],
} = {}) {
  requirePersistence();

  return ChatSession.create({
    demoSessionId,
    title,
    currentSelectedDocumentIds: selectedDocumentIds,
    currentSelectedFolderIds: selectedFolderIds,
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
  });
}

export async function listChatSessionsByDemoSession({
  demoSessionId,
  includeTrash = false,
} = {}) {
  requirePersistence();

  return ChatSession.find({
    demoSessionId,
    ...activeFilter(includeTrash),
  })
    .sort({ lastMessageAt: -1, updatedAt: -1, createdAt: -1 })
    .lean();
}

export async function countActiveChatSessionsByDemoSession({ demoSessionId } = {}) {
  requirePersistence();

  return ChatSession.countDocuments({
    demoSessionId,
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
  });
}

export async function getChatSessionById({
  chatId,
  demoSessionId,
  includeTrash = false,
} = {}) {
  requirePersistence();
  if (!isValidMongoId(chatId)) {
    return null;
  }

  const chat = await ChatSession.findOne({
    _id: chatId,
    demoSessionId,
    ...activeFilter(includeTrash),
  }).lean();

  return chat || null;
}

export async function updateChatSession({ chatId, demoSessionId, patch = {} } = {}) {
  requirePersistence();
  if (!isValidMongoId(chatId)) {
    return null;
  }

  return ChatSession.findOneAndUpdate(
    { _id: chatId, demoSessionId, lifecycleStatus: LIFECYCLE_STATUS.ACTIVE },
    { $set: patch },
    { new: true, lean: true },
  );
}

export async function softDeleteChatSession({ chatId, demoSessionId } = {}) {
  requirePersistence();
  if (!isValidMongoId(chatId)) {
    return null;
  }

  return ChatSession.findOneAndUpdate(
    { _id: chatId, demoSessionId, lifecycleStatus: LIFECYCLE_STATUS.ACTIVE },
    { $set: { lifecycleStatus: LIFECYCLE_STATUS.TRASHED } },
    { new: true, lean: true },
  );
}

export async function updateSelection({
  chatId,
  demoSessionId,
  selectedDocumentIds = [],
  selectedFolderIds = [],
} = {}) {
  requirePersistence();
  if (!isValidMongoId(chatId)) {
    return null;
  }

  return ChatSession.findOneAndUpdate(
    { _id: chatId, demoSessionId, lifecycleStatus: LIFECYCLE_STATUS.ACTIVE },
    {
      $set: {
        currentSelectedDocumentIds: selectedDocumentIds,
        currentSelectedFolderIds: selectedFolderIds,
      },
    },
    { new: true, lean: true },
  );
}

export async function incrementMessageCount({ chatId, demoSessionId, at = new Date() } = {}) {
  requirePersistence();
  if (!isValidMongoId(chatId)) {
    return null;
  }

  return ChatSession.findOneAndUpdate(
    { _id: chatId, demoSessionId, lifecycleStatus: LIFECYCLE_STATUS.ACTIVE },
    {
      $inc: { messageCount: 1 },
      $set: { lastMessageAt: at },
    },
    { new: true, lean: true },
  );
}

export function createMemoryChatSessionRepository({ seed = [], now = () => new Date() } = {}) {
  const chats = new Map();
  let counter = 0;

  function clone(chat) {
    return chat ? { ...chat, currentSelectedDocumentIds: [...chat.currentSelectedDocumentIds], currentSelectedFolderIds: [...chat.currentSelectedFolderIds] } : null;
  }

  for (const chat of seed) {
    const id = String(chat.id || chat._id || `chat_${++counter}`);
    chats.set(id, {
      _id: id,
      demoSessionId: chat.demoSessionId,
      title: chat.title || "New chat",
      currentSelectedDocumentIds: [...(chat.currentSelectedDocumentIds || [])],
      currentSelectedFolderIds: [...(chat.currentSelectedFolderIds || [])],
      rollingSummary: chat.rollingSummary || null,
      messageCount: chat.messageCount || 0,
      aiPromptCount: chat.aiPromptCount || 0,
      archivedAt: chat.archivedAt || null,
      lifecycleStatus: chat.lifecycleStatus || LIFECYCLE_STATUS.ACTIVE,
      createdAt: chat.createdAt || now(),
      updatedAt: chat.updatedAt || now(),
      lastMessageAt: chat.lastMessageAt || null,
    });
  }

  return {
    async createChatSession({ demoSessionId, title, selectedDocumentIds = [], selectedFolderIds = [] }) {
      const at = now();
      const id = `chat_${++counter}`;
      const chat = {
        _id: id,
        demoSessionId,
        title,
        currentSelectedDocumentIds: [...selectedDocumentIds],
        currentSelectedFolderIds: [...selectedFolderIds],
        rollingSummary: null,
        messageCount: 0,
        aiPromptCount: 0,
        archivedAt: null,
        lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
        createdAt: at,
        updatedAt: at,
        lastMessageAt: null,
      };
      chats.set(id, chat);
      return clone(chat);
    },
    async listChatSessionsByDemoSession({ demoSessionId, includeTrash = false }) {
      return [...chats.values()]
        .filter((chat) => chat.demoSessionId === demoSessionId)
        .filter((chat) => includeTrash || chat.lifecycleStatus === LIFECYCLE_STATUS.ACTIVE)
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
        .map(clone);
    },
    async countActiveChatSessionsByDemoSession({ demoSessionId }) {
      return [...chats.values()].filter(
        (chat) => chat.demoSessionId === demoSessionId && chat.lifecycleStatus === LIFECYCLE_STATUS.ACTIVE,
      ).length;
    },
    async getChatSessionById({ chatId, demoSessionId, includeTrash = false }) {
      const chat = chats.get(String(chatId));
      if (!chat || chat.demoSessionId !== demoSessionId) {
        return null;
      }
      if (!includeTrash && chat.lifecycleStatus !== LIFECYCLE_STATUS.ACTIVE) {
        return null;
      }
      return clone(chat);
    },
    async updateChatSession({ chatId, demoSessionId, patch = {} }) {
      const chat = chats.get(String(chatId));
      if (!chat || chat.demoSessionId !== demoSessionId || chat.lifecycleStatus !== LIFECYCLE_STATUS.ACTIVE) {
        return null;
      }
      Object.assign(chat, patch, { updatedAt: now() });
      return clone(chat);
    },
    async softDeleteChatSession({ chatId, demoSessionId }) {
      return this.updateChatSession({
        chatId,
        demoSessionId,
        patch: { lifecycleStatus: LIFECYCLE_STATUS.TRASHED },
      });
    },
    async updateSelection({ chatId, demoSessionId, selectedDocumentIds = [], selectedFolderIds = [] }) {
      return this.updateChatSession({
        chatId,
        demoSessionId,
        patch: {
          currentSelectedDocumentIds: [...selectedDocumentIds],
          currentSelectedFolderIds: [...selectedFolderIds],
        },
      });
    },
    async incrementMessageCount({ chatId, demoSessionId, at = now() }) {
      const chat = chats.get(String(chatId));
      if (!chat || chat.demoSessionId !== demoSessionId || chat.lifecycleStatus !== LIFECYCLE_STATUS.ACTIVE) {
        return null;
      }
      chat.messageCount += 1;
      chat.lastMessageAt = at;
      chat.updatedAt = at;
      return clone(chat);
    },
    _unsafeSnapshot() {
      return [...chats.values()].map(clone);
    },
  };
}
