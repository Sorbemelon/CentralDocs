import { CLEANUP_STATUS } from "../../constants/lifecycle.constants.js";
import { buildDemoSessionPrefix } from "../storage/s3ObjectKeys.js";
import { deleteObjectsByPrefix } from "../storage/s3Storage.service.js";
import {
  buildSessionUserDataDeletePlan,
  deleteSessionUserData,
  updateCleanupStatus,
} from "./demoSession.repository.js";

function skippedMongoResult(demoSessionId) {
  return {
    status: "skipped_not_configured",
    deleted: {},
    plan: buildSessionUserDataDeletePlan(demoSessionId),
  };
}

export function buildClearSessionPlan(demoSessionId) {
  const prefix = buildDemoSessionPrefix({ demoSessionId });

  return {
    demoSessionId,
    mongo: buildSessionUserDataDeletePlan(demoSessionId),
    s3: {
      prefix,
      preservedPrefixes: ["mock/"],
    },
    preserves: ["backend/mock-data", "manifest-derived mock workspace", "mock/* S3 keys"],
  };
}

export async function cleanupDemoSessionData(
  demoSessionId,
  {
    repository = { deleteSessionUserData, updateCleanupStatus },
    storage = { deleteObjectsByPrefix },
    persistenceAvailable = true,
  } = {},
) {
  if (!demoSessionId) {
    return {
      plan: null,
      mongo: skippedMongoResult(demoSessionId),
      s3: { status: "skipped_not_configured", prefix: null, deletedCount: 0 },
    };
  }

  const plan = buildClearSessionPlan(demoSessionId);

  try {
    await repository.updateCleanupStatus?.(demoSessionId, CLEANUP_STATUS.PENDING);
    const mongo = persistenceAvailable
      ? await repository.deleteSessionUserData(demoSessionId)
      : skippedMongoResult(demoSessionId);
    const s3 = await storage.deleteObjectsByPrefix({ prefix: plan.s3.prefix });

    if (mongo.status === "completed") {
      await repository.updateCleanupStatus?.(demoSessionId, CLEANUP_STATUS.COMPLETED);
    }

    return {
      plan,
      mongo,
      s3,
    };
  } catch (error) {
    await repository.updateCleanupStatus?.(demoSessionId, CLEANUP_STATUS.FAILED);
    return {
      plan,
      mongo: { status: "failed", errorCode: error.code || "CLEAR_SESSION_FAILED" },
      s3: { status: "failed", errorCode: error.code || "CLEAR_SESSION_FAILED" },
    };
  }
}
