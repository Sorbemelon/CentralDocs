import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  EMBEDDING_PROVIDER,
} from "../../constants/embedding.constants.js";

export function toEmbeddedChunkDraft(chunk, embeddingResult, { embeddedAt = new Date() } = {}) {
  return {
    ...chunk,
    embedding: embeddingResult.embedding,
    embeddingModel: embeddingResult.model || EMBEDDING_MODEL,
    embeddingDimensions: embeddingResult.dimensions || EMBEDDING_DIMENSIONS,
    embeddingMeta: {
      provider: embeddingResult.provider || EMBEDDING_PROVIDER,
      model: embeddingResult.model || EMBEDDING_MODEL,
      dimensions: embeddingResult.dimensions || EMBEDDING_DIMENSIONS,
      keySlot: Number.isInteger(embeddingResult.keySlot) ? embeddingResult.keySlot : null,
      embeddedAt: embeddedAt.toISOString(),
      warnings: embeddingResult.warnings || [],
    },
  };
}

export function buildEmbeddingPipelineResult({ chunks = [], warnings = [], aiRouting = [] } = {}) {
  const failedCount = aiRouting.filter((attempt) => attempt.status === "failed").length;

  return {
    chunks,
    stats: {
      chunkCount: chunks.length,
      embeddedCount: chunks.length,
      failedCount,
      embeddingModel: EMBEDDING_MODEL,
      embeddingDimensions: EMBEDDING_DIMENSIONS,
      provider: EMBEDDING_PROVIDER,
      rateLimitEncountered: aiRouting.some((attempt) => attempt.isRateLimit),
      fallbackUsed: false,
    },
    warnings,
    aiRouting,
  };
}
