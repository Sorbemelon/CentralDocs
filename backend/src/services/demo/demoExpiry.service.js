import { CLEANUP_STATUS, DEMO_SESSION_STATUS } from "../../constants/lifecycle.constants.js";
import { cleanupDemoSessionData } from "./demoCleanup.service.js";
import {
  buildExpiredSessionFilter as buildRepositoryExpiredSessionFilter,
  findExpiredSessions,
  isDemoSessionPersistenceAvailable,
  markExpired,
} from "./demoSession.repository.js";

export function buildExpiredSessionFilter(currentTime = new Date()) {
  return buildRepositoryExpiredSessionFilter(currentTime);
}

export function expireSessionIfNeeded(session, currentTime = new Date()) {
  if (!session || session.status === DEMO_SESSION_STATUS.EXPIRED) {
    return session || null;
  }

  if (new Date(session.expiresAt).getTime() > currentTime.getTime()) {
    return session;
  }

  return {
    ...session,
    status: DEMO_SESSION_STATUS.EXPIRED,
    cleanupStatus: CLEANUP_STATUS.PENDING,
  };
}

export async function cleanupExpiredDemoSessions({
  repository = {
    isDemoSessionPersistenceAvailable,
    findExpiredSessions,
    markExpired,
  },
  cleanup = cleanupDemoSessionData,
  currentTime = new Date(),
  limit = 25,
} = {}) {
  if (!repository.isDemoSessionPersistenceAvailable()) {
    return {
      status: "skipped_not_configured",
      expiredCount: 0,
      cleanedCount: 0,
    };
  }

  const expiredSessions = await repository.findExpiredSessions({ currentTime, limit });
  let cleanedCount = 0;

  for (const session of expiredSessions) {
    await repository.markExpired(session.sessionId, currentTime);
    await cleanup(session.sessionId);
    cleanedCount += 1;
  }

  return {
    status: "completed",
    expiredCount: expiredSessions.length,
    cleanedCount,
  };
}
