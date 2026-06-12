import { nanoid } from "nanoid";
import { getDemoClearUsagePolicy } from "../../config/env.js";
import { DEMO_LIMITS, EMPTY_DEMO_USAGE } from "../../config/limits.js";
import { CLEANUP_STATUS, DEMO_SESSION_STATUS } from "../../constants/lifecycle.constants.js";
import { addDays, now } from "../../utils/time.js";
import { cleanupDemoSessionData } from "./demoCleanup.service.js";
import { cleanupExpiredDemoSessions, expireSessionIfNeeded } from "./demoExpiry.service.js";
import {
  createSession as createPersistentSession,
  findBySessionId,
  isDemoSessionPersistenceAvailable,
  markExpired,
  updateLastActive,
  updateUsage,
} from "./demoSession.repository.js";
import { getRemainingLimits, getUsageSnapshot } from "./demoUsage.service.js";

const inMemorySessions = new Map();

function createSessionId() {
  return `demo_${nanoid(18)}`;
}

export function createSessionRecord(sessionId = createSessionId(), createdAt = now(), options = {}) {
  const recordCreatedAt = options.createdAt || createdAt;

  return {
    sessionId,
    status: DEMO_SESSION_STATUS.ACTIVE,
    createdAt: recordCreatedAt,
    lastActiveAt: options.lastActiveAt || recordCreatedAt,
    expiresAt: options.expiresAt || addDays(recordCreatedAt, DEMO_LIMITS.sessionLifetimeDays),
    limits: { ...DEMO_LIMITS, ...(options.limits || {}) },
    usage: options.usage
      ? getUsageSnapshot({ usage: options.usage })
      : { ...EMPTY_DEMO_USAGE },
    cleanupStatus: options.cleanupStatus || CLEANUP_STATUS.NOT_STARTED,
  };
}

function serializeDate(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function getMode(persistence) {
  return persistence === "mongodb" ? "persistent" : "foundation_memory";
}

export function toPublicSession(record, persistence = "memory") {
  const normalized = {
    ...record,
    usage: getUsageSnapshot(record),
    limits: record.limits || { ...DEMO_LIMITS },
  };

  return {
    sessionId: normalized.sessionId,
    status: normalized.status,
    createdAt: serializeDate(normalized.createdAt),
    lastActiveAt: serializeDate(normalized.lastActiveAt),
    expiresAt: serializeDate(normalized.expiresAt),
    limits: normalized.limits,
    usage: normalized.usage,
    remaining: getRemainingLimits(normalized),
    cleanupStatus: normalized.cleanupStatus || CLEANUP_STATUS.NOT_STARTED,
    persistence,
    mode: getMode(persistence),
  };
}

function updateMemorySession(session) {
  inMemorySessions.set(session.sessionId, session);
  return session;
}

async function createPersistentOrMemorySession(persistenceAvailable, options = {}) {
  const record = createSessionRecord(options.sessionId, options.createdAt || now(), options);

  if (persistenceAvailable) {
    return toPublicSession(await createPersistentSession(record), "mongodb");
  }

  return toPublicSession(updateMemorySession(record), "memory");
}

async function createOrResumePersistentSession(requestedSessionId) {
  if (requestedSessionId) {
    const existing = await findBySessionId(requestedSessionId);
    if (existing) {
      const maybeExpired = expireSessionIfNeeded(existing);
      if (maybeExpired.status === DEMO_SESSION_STATUS.ACTIVE) {
        return toPublicSession(await updateLastActive(existing.sessionId, now()), "mongodb");
      }

      await markExpired(existing.sessionId, now());
    }
  }

  return createPersistentOrMemorySession(true);
}

function createOrResumeMemorySession(requestedSessionId) {
  if (requestedSessionId) {
    const existing = inMemorySessions.get(requestedSessionId);
    if (existing) {
      const maybeExpired = expireSessionIfNeeded(existing);
      if (maybeExpired.status === DEMO_SESSION_STATUS.ACTIVE) {
        existing.lastActiveAt = now();
        return toPublicSession(updateMemorySession(existing), "memory");
      }

      updateMemorySession(maybeExpired);
    }
  }

  return createPersistentOrMemorySession(false);
}

export async function createOrResumeDemoSession(requestedSessionId) {
  if (isDemoSessionPersistenceAvailable()) {
    await cleanupExpiredDemoSessions();
    return createOrResumePersistentSession(requestedSessionId);
  }

  return createOrResumeMemorySession(requestedSessionId);
}

function normalizeClearPolicy(policy = getDemoClearUsagePolicy()) {
  return {
    usageReset: policy?.usageReset !== false,
    reason: policy?.reason || (policy?.usageReset === false ? "production_quota_window" : "development_mode"),
  };
}

export async function getDemoSession(requestedSessionId) {
  if (!requestedSessionId) {
    return null;
  }

  if (isDemoSessionPersistenceAvailable()) {
    const existing = await findBySessionId(requestedSessionId);
    if (!existing) {
      return null;
    }

    const maybeExpired = expireSessionIfNeeded(existing);
    if (maybeExpired.status === DEMO_SESSION_STATUS.EXPIRED && existing.status !== DEMO_SESSION_STATUS.EXPIRED) {
      await markExpired(existing.sessionId, now());
    }

    return toPublicSession(maybeExpired, "mongodb");
  }

  const existing = inMemorySessions.get(requestedSessionId);
  if (!existing) {
    return null;
  }

  const maybeExpired = expireSessionIfNeeded(existing);
  if (maybeExpired.status === DEMO_SESSION_STATUS.EXPIRED) {
    updateMemorySession(maybeExpired);
  }

  return toPublicSession(maybeExpired, "memory");
}

export async function applyDemoSessionUsageDelta(sessionId, delta) {
  const current = await getDemoSession(sessionId);
  if (!current) {
    return null;
  }

  const nextUsage = getUsageSnapshot({
    usage: Object.fromEntries(
      Object.entries(current.usage).map(([key, value]) => [key, value + Number(delta[key] || 0)]),
    ),
  });

  if (current.persistence === "mongodb") {
    return toPublicSession(await updateUsage(sessionId, nextUsage), "mongodb");
  }

  const existing = inMemorySessions.get(sessionId);
  existing.usage = nextUsage;
  existing.lastActiveAt = now();
  updateMemorySession(existing);
  return toPublicSession(existing, "memory");
}

export async function clearDemoSession(requestedSessionId, options = {}) {
  const persistenceAvailable = isDemoSessionPersistenceAvailable();
  const previousSessionId = requestedSessionId || null;
  const clearPolicy = normalizeClearPolicy(options.clearPolicy);
  const previousSession = previousSessionId ? await getDemoSession(previousSessionId) : null;
  const canCarryUsage = clearPolicy.usageReset === false &&
    previousSession?.status === DEMO_SESSION_STATUS.ACTIVE;
  const carriedUsage = canCarryUsage
    ? {
        ...getUsageSnapshot(previousSession),
        chatSessions: 0,
      }
    : null;
  const carriedSessionOptions = canCarryUsage
    ? {
        usage: carriedUsage,
        limits: previousSession.limits,
        createdAt: previousSession.createdAt ? new Date(previousSession.createdAt) : now(),
        lastActiveAt: now(),
        expiresAt: previousSession.expiresAt ? new Date(previousSession.expiresAt) : undefined,
      }
    : {};
  const cleanup = previousSessionId
    ? await cleanupDemoSessionData(previousSessionId, { persistenceAvailable })
    : {
        mongo: { status: "skipped_not_configured", deleted: {} },
        s3: { status: "skipped_not_configured", prefix: null, deletedCount: 0 },
      };

  if (!persistenceAvailable && previousSessionId) {
    inMemorySessions.delete(previousSessionId);
  }

  const session = await createPersistentOrMemorySession(persistenceAvailable, carriedSessionOptions);

  return {
    status: "cleared",
    previousSessionId,
    session,
    clearPolicy,
    cleanup: {
      mongo: cleanup.mongo?.status || "skipped_not_configured",
      s3: cleanup.s3?.status || "skipped_not_configured",
      details: cleanup,
    },
  };
}

export async function acceptDemoClear(requestedSessionId) {
  return clearDemoSession(requestedSessionId);
}

export function resetDemoSessionMemoryForTests() {
  inMemorySessions.clear();
}
