import {
  MEDIA_EMBEDDING_DIMENSIONS,
  MEDIA_EMBEDDING_MODEL,
} from "../../constants/mediaEmbedding.constants.js";

export function toMediaEmbeddingResultDto({
  document = {},
  status = "completed",
  cached = false,
  dryRun = false,
  chunk = null,
  inputType = null,
  warnings = [],
  embeddedAt = new Date(),
} = {}) {
  return {
    documentId: document._id ? String(document._id) : document.id ? String(document.id) : null,
    title: document.title || null,
    fileKind: document.fileKind || null,
    status,
    cached,
    dryRun,
    chunkId: chunk?._id ? String(chunk._id) : chunk?.id ? String(chunk.id) : null,
    embeddingModel: MEDIA_EMBEDDING_MODEL,
    embeddingDimensions: MEDIA_EMBEDDING_DIMENSIONS,
    inputType,
    warnings,
    embeddedAt: embeddedAt instanceof Date ? embeddedAt.toISOString() : embeddedAt,
  };
}
