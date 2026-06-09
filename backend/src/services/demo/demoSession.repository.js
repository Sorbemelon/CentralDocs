import { DEMO_SESSION_STATUS, CLEANUP_STATUS } from "../../constants/lifecycle.constants.js";
import { isMongoConnected } from "../../db/connectMongo.js";
import {
  AiRoutingAttempt,
  ChatMessage,
  ChatSession,
  DemoSession,
  Document,
  DocumentChunk,
  Folder,
  UsageEvent,
} from "../../models/index.js";

function toPlain(record) {
  return record?.toObject ? record.toObject() : record;
}

function deletedCount(result) {
  return result?.deletedCount || 0;
}

export function isDemoSessionPersistenceAvailable() {
  return isMongoConnected();
}

export async function findBySessionId(sessionId) {
  if (!sessionId || !isDemoSessionPersistenceAvailable()) {
    return null;
  }

  return toPlain(await DemoSession.findOne({ sessionId }).lean());
}

export async function createSession(record) {
  if (!isDemoSessionPersistenceAvailable()) {
    return null;
  }

  return toPlain(await DemoSession.create(record));
}

export async function updateLastActive(sessionId, lastActiveAt) {
  if (!isDemoSessionPersistenceAvailable()) {
    return null;
  }

  return DemoSession.findOneAndUpdate(
    { sessionId },
    { $set: { lastActiveAt } },
    { new: true, lean: true },
  );
}

export async function updateUsage(sessionId, usage) {
  if (!isDemoSessionPersistenceAvailable()) {
    return null;
  }

  return DemoSession.findOneAndUpdate(
    { sessionId },
    { $set: { usage, lastActiveAt: new Date() } },
    { new: true, lean: true },
  );
}

export async function markExpired(sessionId, expiredAt = new Date()) {
  if (!isDemoSessionPersistenceAvailable()) {
    return null;
  }

  return DemoSession.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        status: DEMO_SESSION_STATUS.EXPIRED,
        cleanupStatus: CLEANUP_STATUS.PENDING,
        lastActiveAt: expiredAt,
      },
    },
    { new: true, lean: true },
  );
}

export async function updateCleanupStatus(sessionId, cleanupStatus) {
  if (!isDemoSessionPersistenceAvailable()) {
    return null;
  }

  return DemoSession.findOneAndUpdate(
    { sessionId },
    { $set: { cleanupStatus, lastActiveAt: new Date() } },
    { new: true, lean: true },
  );
}

export function buildSessionUserDataDeletePlan(demoSessionId) {
  return {
    demoSessionId,
    collections: [
      "DocumentChunk",
      "ChatMessage",
      "ChatSession",
      "Document",
      "Folder",
      "UsageEvent",
      "AiRoutingAttempt",
    ],
    filters: {
      DocumentChunk: { demoSessionId },
      ChatMessage: { demoSessionId },
      ChatSession: { demoSessionId },
      Document: { demoSessionId },
      Folder: { demoSessionId },
      UsageEvent: { demoSessionId },
      AiRoutingAttempt: { demoSessionId },
    },
    preserved: ["mock folders/documents", "backend/mock-data", "mock/* S3 prefix"],
  };
}

export async function deleteSessionUserData(demoSessionId) {
  if (!isDemoSessionPersistenceAvailable()) {
    return {
      status: "skipped_not_configured",
      deleted: {},
      plan: buildSessionUserDataDeletePlan(demoSessionId),
    };
  }

  const deleted = {
    documentChunks: deletedCount(await DocumentChunk.deleteMany({ demoSessionId })),
    chatMessages: deletedCount(await ChatMessage.deleteMany({ demoSessionId })),
    chatSessions: deletedCount(await ChatSession.deleteMany({ demoSessionId })),
    documents: deletedCount(await Document.deleteMany({ demoSessionId })),
    folders: deletedCount(await Folder.deleteMany({ demoSessionId })),
    usageEvents: deletedCount(await UsageEvent.deleteMany({ demoSessionId })),
    aiRoutingAttempts: deletedCount(await AiRoutingAttempt.deleteMany({ demoSessionId })),
  };

  return {
    status: "completed",
    deleted,
    plan: buildSessionUserDataDeletePlan(demoSessionId),
  };
}

export function buildExpiredSessionFilter(currentTime = new Date()) {
  return {
    status: DEMO_SESSION_STATUS.ACTIVE,
    expiresAt: { $lte: currentTime },
  };
}

export async function findExpiredSessions({ currentTime = new Date(), limit = 25 } = {}) {
  if (!isDemoSessionPersistenceAvailable()) {
    return [];
  }

  return DemoSession.find(buildExpiredSessionFilter(currentTime)).limit(limit).lean();
}
