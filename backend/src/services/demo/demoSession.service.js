import { nanoid } from "nanoid";
import { DEMO_LIMITS, EMPTY_DEMO_USAGE } from "../../config/limits.js";
import { isMongoConnected } from "../../db/connectMongo.js";
import { DemoSession } from "../../models/DemoSession.model.js";
import { addDays, isPast, now } from "../../utils/time.js";

const inMemorySessions = new Map();

function createSessionId() {
  return `demo_${nanoid(18)}`;
}

function createSessionRecord(sessionId = createSessionId()) {
  const createdAt = now();

  return {
    sessionId,
    status: "active",
    createdAt,
    lastActiveAt: createdAt,
    expiresAt: addDays(createdAt, DEMO_LIMITS.sessionLifetimeDays),
    limits: { ...DEMO_LIMITS },
    usage: { ...EMPTY_DEMO_USAGE },
    cleanupStatus: "not_started",
  };
}

function toPublicSession(record, persistence) {
  return {
    sessionId: record.sessionId,
    status: record.status,
    createdAt: record.createdAt,
    lastActiveAt: record.lastActiveAt,
    expiresAt: record.expiresAt,
    limits: record.limits,
    usage: record.usage,
    cleanupStatus: record.cleanupStatus,
    persistence,
  };
}

async function upsertMongoSession(requestedSessionId) {
  if (requestedSessionId) {
    const existing = await DemoSession.findOne({ sessionId: requestedSessionId });
    if (existing && existing.status === "active" && !isPast(existing.expiresAt)) {
      existing.lastActiveAt = now();
      await existing.save();
      return toPublicSession(existing.toObject(), "mongodb");
    }
  }

  const created = await DemoSession.create(createSessionRecord());
  return toPublicSession(created.toObject(), "mongodb");
}

function upsertMemorySession(requestedSessionId) {
  if (requestedSessionId) {
    const existing = inMemorySessions.get(requestedSessionId);
    if (existing && existing.status === "active" && !isPast(existing.expiresAt)) {
      existing.lastActiveAt = now();
      inMemorySessions.set(existing.sessionId, existing);
      return toPublicSession(existing, "memory");
    }
  }

  const created = createSessionRecord();
  inMemorySessions.set(created.sessionId, created);
  return toPublicSession(created, "memory");
}

export async function createOrResumeDemoSession(requestedSessionId) {
  if (isMongoConnected()) {
    return upsertMongoSession(requestedSessionId);
  }

  return upsertMemorySession(requestedSessionId);
}

export async function getDemoSession(requestedSessionId) {
  if (!requestedSessionId) {
    return null;
  }

  if (isMongoConnected()) {
    const existing = await DemoSession.findOne({ sessionId: requestedSessionId });
    if (!existing) {
      return null;
    }

    return toPublicSession(existing.toObject(), "mongodb");
  }

  const existing = inMemorySessions.get(requestedSessionId);
  return existing ? toPublicSession(existing, "memory") : null;
}

export async function acceptDemoClear(requestedSessionId) {
  if (!requestedSessionId) {
    return {
      accepted: true,
      sessionId: null,
      cleanupStatus: "accepted",
      message: "Clear accepted. No Phase 1A data deletion was performed.",
    };
  }

  if (isMongoConnected()) {
    await DemoSession.updateOne(
      { sessionId: requestedSessionId },
      { $set: { cleanupStatus: "accepted", lastActiveAt: now() } },
    );
  } else if (inMemorySessions.has(requestedSessionId)) {
    const existing = inMemorySessions.get(requestedSessionId);
    existing.cleanupStatus = "accepted";
    existing.lastActiveAt = now();
    inMemorySessions.set(requestedSessionId, existing);
  }

  return {
    accepted: true,
    sessionId: requestedSessionId,
    cleanupStatus: "accepted",
    message: "Clear accepted. Full hard-delete cleanup is reserved for a later phase.",
  };
}
