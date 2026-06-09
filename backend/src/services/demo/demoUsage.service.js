import { DEMO_LIMITS, EMPTY_DEMO_USAGE } from "../../config/limits.js";
import { createHttpError } from "../../utils/httpError.js";

const USAGE_KEYS = Object.freeze(Object.keys(EMPTY_DEMO_USAGE));

function toNonNegativeNumber(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

export function getUsageSnapshot(session = {}) {
  const usage = session.usage || {};

  return {
    uploadedFiles: toNonNegativeNumber(usage.uploadedFiles),
    chatSessions: toNonNegativeNumber(usage.chatSessions),
    aiPrompts: toNonNegativeNumber(usage.aiPrompts),
    generatedDocuments: toNonNegativeNumber(usage.generatedDocuments),
    userFolders: toNonNegativeNumber(usage.userFolders),
    storageBytes: toNonNegativeNumber(usage.storageBytes),
  };
}

export function getRemainingLimits(session = {}) {
  const usage = getUsageSnapshot(session);

  return {
    uploadedFiles: Math.max(0, DEMO_LIMITS.maxUploadedFiles - usage.uploadedFiles),
    chatSessions: Math.max(0, DEMO_LIMITS.maxChatSessions - usage.chatSessions),
    aiPrompts: Math.max(0, DEMO_LIMITS.maxAiPrompts - usage.aiPrompts),
    generatedDocuments: Math.max(
      0,
      DEMO_LIMITS.maxGeneratedDocuments - usage.generatedDocuments,
    ),
    userFolders: Math.max(0, DEMO_LIMITS.maxUserFolders - usage.userFolders),
    storageBytes: Math.max(0, DEMO_LIMITS.maxStorageBytes - usage.storageBytes),
    generatedDocumentBytes: DEMO_LIMITS.maxGeneratedDocumentBytes,
    promptLengthChars: DEMO_LIMITS.maxPromptLengthChars,
    generateDocumentInstructionLengthChars:
      DEMO_LIMITS.maxGenerateDocumentInstructionLengthChars,
    semanticSearchQueryLengthChars: DEMO_LIMITS.maxSemanticSearchQueryLengthChars,
    topKRetrieval: DEMO_LIMITS.topKRetrieval,
    visibleReferences: DEMO_LIMITS.visibleReferences,
    recentChatHistoryMessages: DEMO_LIMITS.recentChatHistoryMessages,
    sessionLifetimeDays: DEMO_LIMITS.sessionLifetimeDays,
  };
}

function throwLimitReached(message, details = undefined) {
  throw createHttpError(409, message, "DEMO_LIMIT_REACHED", details);
}

export function assertCanCreateFolder(session) {
  if (getUsageSnapshot(session).userFolders >= DEMO_LIMITS.maxUserFolders) {
    throwLimitReached("The demo user folder limit has been reached.");
  }
}

export function assertCanUploadFile(session, fileSizeBytes = 0) {
  const usage = getUsageSnapshot(session);
  const size = toNonNegativeNumber(fileSizeBytes);

  if (usage.uploadedFiles >= DEMO_LIMITS.maxUploadedFiles) {
    throwLimitReached("The demo uploaded file limit has been reached.");
  }
  if (usage.storageBytes + size > DEMO_LIMITS.maxStorageBytes) {
    throwLimitReached("The demo storage limit has been reached.");
  }
}

export function assertCanCreateChat(session) {
  if (getUsageSnapshot(session).chatSessions >= DEMO_LIMITS.maxChatSessions) {
    throwLimitReached("The demo chat session limit has been reached.");
  }
}

export function assertCanSendAiPrompt(session) {
  if (getUsageSnapshot(session).aiPrompts >= DEMO_LIMITS.maxAiPrompts) {
    throwLimitReached("The demo AI prompt limit has been reached.");
  }
}

export function assertCanGenerateDocument(session) {
  if (getUsageSnapshot(session).generatedDocuments >= DEMO_LIMITS.maxGeneratedDocuments) {
    throwLimitReached("The demo generated document limit has been reached.");
  }
}

export function assertPromptLength(prompt = "") {
  if (String(prompt).length > DEMO_LIMITS.maxPromptLengthChars) {
    throwLimitReached("The demo AI prompt length limit has been reached.");
  }
}

export function assertGenerateDocumentInstructionLength(instruction = "") {
  if (String(instruction).length > DEMO_LIMITS.maxGenerateDocumentInstructionLengthChars) {
    throwLimitReached("The generated document instruction length limit has been reached.");
  }
}

export function assertSemanticSearchQueryLength(query = "") {
  if (String(query).length > DEMO_LIMITS.maxSemanticSearchQueryLengthChars) {
    throwLimitReached("The semantic search query length limit has been reached.");
  }
}

export function applyUsageDelta(session = {}, delta = {}) {
  const usage = getUsageSnapshot(session);
  const nextUsage = { ...usage };

  for (const key of USAGE_KEYS) {
    if (delta[key] !== undefined) {
      nextUsage[key] = Math.max(0, usage[key] + Number(delta[key] || 0));
    }
  }

  return {
    ...session,
    usage: nextUsage,
  };
}
