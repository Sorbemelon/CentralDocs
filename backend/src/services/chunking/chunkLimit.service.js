import { CHUNKING_LIMITS } from "../../constants/chunking.constants.js";

export function createChunkWarning(code, message, details = undefined) {
  return {
    code,
    message,
    ...(details ? { details } : {}),
  };
}

export function getMaxChunksForSource({ scope = null, sourceType = null } = {}) {
  if (scope === "mock" || sourceType === "mock") {
    return CHUNKING_LIMITS.maxMockChunks;
  }
  if (scope === "generated" || sourceType === "generated") {
    return CHUNKING_LIMITS.maxGeneratedChunks;
  }

  return CHUNKING_LIMITS.maxUploadedChunks;
}

export function getChunkLimits(options = {}) {
  return {
    maxChunks: options.maxChunks || getMaxChunksForSource(options),
    maxTokens: options.maxTokens || CHUNKING_LIMITS.targetMaxTokens,
    minUsefulTokens: options.minUsefulTokens || CHUNKING_LIMITS.minUsefulTokens,
    overlapTokens: options.overlapTokens ?? CHUNKING_LIMITS.overlapTokens,
    maxContentPreviewChars:
      options.maxContentPreviewChars || CHUNKING_LIMITS.maxContentPreviewChars,
  };
}

export function applyChunkCountLimit(chunks = [], { maxChunks, warnings = [] } = {}) {
  if (chunks.length <= maxChunks) {
    return {
      chunks,
      truncated: false,
      warnings,
    };
  }

  return {
    chunks: chunks.slice(0, maxChunks),
    truncated: true,
    warnings: [
      ...warnings,
      createChunkWarning(
        "CHUNK_COUNT_TRUNCATED",
        `Chunk drafts were limited to ${maxChunks}.`,
        { maxChunks, originalChunkCount: chunks.length },
      ),
    ],
  };
}

export function capContentPreview(text = "", maxChars = CHUNKING_LIMITS.maxContentPreviewChars) {
  const value = String(text || "");
  return value.length <= maxChars ? value : value.slice(0, maxChars).trimEnd();
}
