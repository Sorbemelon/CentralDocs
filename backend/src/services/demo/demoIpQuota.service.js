import {
  getDemoIpQuotaMultiplier,
  getDemoQuotaWindowDays,
  isDemoIpQuotaEnabled,
} from "../../config/env.js";
import { DEMO_LIMITS } from "../../config/limits.js";
import { createHttpError } from "../../utils/httpError.js";
import { addDays, now as defaultNow } from "../../utils/time.js";
import * as defaultRepository from "./demoIpQuota.repository.js";

export const DEMO_IP_QUOTA_ERROR_CODE = "DEMO_IP_QUOTA_LIMIT_REACHED";

const EMPTY_IP_QUOTA_USAGE = Object.freeze({
  uploadedFiles: 0,
  aiPrompts: 0,
  generatedDocuments: 0,
  storageBytes: 0,
});

function normalizeUsage(usage = {}) {
  return {
    uploadedFiles: Math.max(0, Number(usage.uploadedFiles || 0)),
    aiPrompts: Math.max(0, Number(usage.aiPrompts || 0)),
    generatedDocuments: Math.max(0, Number(usage.generatedDocuments || 0)),
    storageBytes: Math.max(0, Number(usage.storageBytes || 0)),
  };
}

function normalizeDelta(delta = {}) {
  return normalizeUsage(delta);
}

function quotaWindowId(window = {}) {
  return window._id || window.id || null;
}

export function getHiddenIpQuotaLimits({
  baseLimits = DEMO_LIMITS,
  multiplier = getDemoIpQuotaMultiplier(),
} = {}) {
  return {
    uploadedFiles: baseLimits.maxUploadedFiles * multiplier,
    aiPrompts: baseLimits.maxAiPrompts * multiplier,
    generatedDocuments: baseLimits.maxGeneratedDocuments * multiplier,
    storageBytes: baseLimits.maxStorageBytes * multiplier,
  };
}

export function createQuotaWindowRecord({
  identityHash,
  at = defaultNow(),
  quotaWindowDays = getDemoQuotaWindowDays(),
} = {}) {
  const windowStartedAt = at instanceof Date ? at : new Date(at);

  return {
    identityHash,
    windowStartedAt,
    expiresAt: addDays(windowStartedAt, quotaWindowDays),
    usage: { ...EMPTY_IP_QUOTA_USAGE },
  };
}

function assertWithinHiddenLimits(usage = {}, delta = {}, limits = getHiddenIpQuotaLimits()) {
  const current = normalizeUsage(usage);
  const nextDelta = normalizeDelta(delta);
  const exceeded = Object.entries(limits).some(
    ([key, limit]) => current[key] + nextDelta[key] > limit,
  );

  if (exceeded) {
    throw createHttpError(
      429,
      "Demo usage limit reached for this period. Please try again later.",
      DEMO_IP_QUOTA_ERROR_CODE,
    );
  }
}

async function getOrCreateQuotaWindow({
  identityHash,
  at = defaultNow(),
  repository = defaultRepository,
} = {}) {
  const active = await repository.findActiveQuotaWindow?.({ identityHash, at });
  if (active) {
    return active;
  }

  return repository.createQuotaWindow?.(createQuotaWindowRecord({ identityHash, at })) || null;
}

function shouldSkipHiddenQuota({ quotaIdentity, repository = defaultRepository } = {}) {
  if (!isDemoIpQuotaEnabled() || !quotaIdentity?.enabled || !quotaIdentity.identityHash) {
    return {
      skipped: true,
      reason: quotaIdentity?.reason || "disabled",
    };
  }

  if (repository.isDemoIpQuotaPersistenceAvailable?.() === false) {
    return {
      skipped: true,
      reason: "persistence_not_configured",
    };
  }

  return { skipped: false, reason: null };
}

export async function assertHiddenIpQuotaAvailable({
  quotaIdentity,
  delta = {},
  repository = defaultRepository,
  at = defaultNow(),
} = {}) {
  const skip = shouldSkipHiddenQuota({ quotaIdentity, repository });
  if (skip.skipped) {
    return { status: "skipped", reason: skip.reason };
  }

  const window = await getOrCreateQuotaWindow({
    identityHash: quotaIdentity.identityHash,
    repository,
    at,
  });
  if (!window) {
    return { status: "skipped", reason: "persistence_not_configured" };
  }

  assertWithinHiddenLimits(window.usage, delta);

  return { status: "checked" };
}

export async function applyHiddenIpQuotaUsageDelta({
  quotaIdentity,
  delta = {},
  repository = defaultRepository,
  at = defaultNow(),
} = {}) {
  const skip = shouldSkipHiddenQuota({ quotaIdentity, repository });
  if (skip.skipped) {
    return { status: "skipped", reason: skip.reason };
  }

  const window = await getOrCreateQuotaWindow({
    identityHash: quotaIdentity.identityHash,
    repository,
    at,
  });
  if (!window) {
    return { status: "skipped", reason: "persistence_not_configured" };
  }

  const current = normalizeUsage(window.usage);
  const nextDelta = normalizeDelta(delta);
  const nextUsage = {
    uploadedFiles: current.uploadedFiles + nextDelta.uploadedFiles,
    aiPrompts: current.aiPrompts + nextDelta.aiPrompts,
    generatedDocuments: current.generatedDocuments + nextDelta.generatedDocuments,
    storageBytes: current.storageBytes + nextDelta.storageBytes,
  };

  assertWithinHiddenLimits(current, nextDelta);

  const updated = await repository.updateQuotaWindowUsage?.({
    quotaWindowId: quotaWindowId(window),
    usage: nextUsage,
  });

  return {
    status: updated ? "updated" : "skipped",
    reason: updated ? null : "persistence_not_configured",
  };
}
