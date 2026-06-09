import { toDocumentDto } from "../documents/document.dto.js";

function safeGenerationMeta(generation = {}) {
  return {
    model: generation.model || null,
    fallbackUsed: Boolean(generation.fallbackUsed),
    fallbackLevel: generation.fallbackLevel || 0,
    keySlotUsed: Number.isInteger(generation.keySlot) ? generation.keySlot : null,
    latencyMs: generation.latencyMs ?? null,
    referencesIncluded: Boolean(generation.referencesIncluded),
    indexed: Boolean(generation.indexed),
    warnings: generation.warnings || [],
  };
}

function safeDownloadMeta(download = {}) {
  return {
    available: Boolean(download.available),
    filename: download.filename || null,
    downloadUrl: download.downloadUrl || null,
    expiresInSeconds: download.expiresInSeconds || null,
  };
}

export function toGeneratedDocumentResponseDto({
  document,
  generation = {},
  download = {},
  usage = {},
  remaining = {},
} = {}) {
  return {
    document: toDocumentDto(document),
    generation: safeGenerationMeta(generation),
    download: safeDownloadMeta(download),
    usage,
    remaining,
  };
}
