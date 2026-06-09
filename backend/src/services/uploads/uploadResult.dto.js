import {
  DOCUMENT_SCOPE,
  DOCUMENT_STATUS,
  SOURCE_TYPE,
} from "../../constants/document.constants.js";
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
  const isActive = raw.lifecycleStatus === "active";
  const isUpload =
    raw.scope === DOCUMENT_SCOPE.USER &&
    raw.sourceType === SOURCE_TYPE.UPLOAD &&
    !raw.readOnly;
  const hasOriginalObject = Boolean(raw.objectKey && raw.storageProvider === "s3");
  const retryableStatus = [DOCUMENT_STATUS.FAILED, DOCUMENT_STATUS.UPLOADED].includes(raw.status);
  const retryAvailable = Boolean(isActive && isUpload && hasOriginalObject && retryableStatus);
  let retryReason = null;

  if (!retryAvailable) {
    if (!isActive) {
      retryReason = "Document is not active.";
    } else if (!isUpload) {
      retryReason = "Only user uploaded documents can be retried.";
    } else if (!hasOriginalObject) {
      retryReason = "Original uploaded file is not available in storage.";
    } else if (raw.status === DOCUMENT_STATUS.READY) {
      retryReason = "Ready upload documents require force=true to reprocess.";
    } else {
      retryReason = "Document status is not retryable.";
    }
  }

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
    retryAvailable,
    retryReason,
  };
}
