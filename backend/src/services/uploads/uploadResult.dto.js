import { DOCUMENT_STATUS } from "../../constants/document.constants.js";
import { toDocumentDto } from "../documents/document.dto.js";

function toProcessingDto(processing = {}, document = {}) {
  return {
    status: processing.status || document.status || null,
    statusSequence: processing.statusSequence || [],
    indexed: Boolean(processing.indexing),
    statusMessage: document.statusMessage || null,
    warnings: processing.warnings || [],
  };
}

export function toUploadResultDto({
  document,
  processing = {},
  usage = {},
  remaining = {},
  warnings = [],
} = {}) {
  return {
    document: toDocumentDto(document),
    processing: toProcessingDto(processing, document),
    usage,
    remaining,
    warnings,
  };
}

export function toDocumentStatusDto(document = {}) {
  const raw = document?.toObject ? document.toObject() : document;
  const contentStats = raw.contentStats || {};
  const ready = raw.status === DOCUMENT_STATUS.READY && raw.lifecycleStatus === "active";
  const chunkCount = contentStats.chunkCount || 0;

  return {
    documentId: raw._id ? String(raw._id) : raw.id ? String(raw.id) : null,
    status: raw.status || null,
    statusMessage: raw.statusMessage || null,
    contentStats: {
      extractedCharCount: contentStats.extractedCharCount || 0,
      optimizedCharCount: contentStats.optimizedCharCount || 0,
      estimatedTokenCount: contentStats.estimatedTokenCount || 0,
      chunkCount,
    },
    downloadAvailable: Boolean(raw.objectKey && raw.lifecycleStatus === "active"),
    searchable: Boolean(ready && chunkCount > 0),
    attachable: Boolean(ready),
  };
}
