import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "../../constants/embedding.constants.js";

export function toIndexingResultDto({
  document = {},
  contentStats = {},
  chunkCount = 0,
  warnings = [],
  aiRouting = [],
  indexedAt = new Date(),
  status = "ready",
} = {}) {
  return {
    documentId: document._id ? String(document._id) : document.id ? String(document.id) : null,
    title: document.title || null,
    status,
    chunkCount,
    embeddingModel: EMBEDDING_MODEL,
    embeddingDimensions: EMBEDDING_DIMENSIONS,
    contentStats,
    warnings,
    aiRouting,
    indexedAt: indexedAt instanceof Date ? indexedAt.toISOString() : indexedAt,
  };
}
