import { DOCUMENT_STATUS } from "../../constants/document.constants.js";

const SECRETISH_PATTERN = /(api[_-]?key|secret|token|password)\s*[:=]\s*[^\s,;]+/gi;
const WINDOWS_PATH_PATTERN = /[A-Za-z]:\\[^\s"'<>]+/g;
const POSIX_ABSOLUTE_PATH_PATTERN = /\/(?:Users|home|tmp|var|etc|mnt)\/[^\s"'<>]+/g;

function sanitizeStatusMessage(message) {
  if (!message) {
    return null;
  }

  return String(message)
    .replace(SECRETISH_PATTERN, "$1=[redacted]")
    .replace(WINDOWS_PATH_PATTERN, "[local-path]")
    .replace(POSIX_ABSOLUTE_PATH_PATTERN, "[local-path]")
    .slice(0, 500);
}

export function buildStatusPatch(status, statusMessage = null) {
  return {
    status,
    statusMessage: sanitizeStatusMessage(statusMessage),
  };
}

export function markExtracting() {
  return buildStatusPatch(DOCUMENT_STATUS.EXTRACTING, "Extracting document text.");
}

export function markOptimizing() {
  return buildStatusPatch(DOCUMENT_STATUS.OPTIMIZING, "Optimizing extracted text.");
}

export function markChunking() {
  return buildStatusPatch(DOCUMENT_STATUS.CHUNKING, "Creating searchable chunks.");
}

export function markEmbedding() {
  return buildStatusPatch(DOCUMENT_STATUS.EMBEDDING, "Embedding searchable chunks.");
}

export function markReady({ contentStats = {} } = {}) {
  return {
    ...buildStatusPatch(DOCUMENT_STATUS.READY, null),
    contentStats,
  };
}

export function markFailed({ error } = {}) {
  return buildStatusPatch(
    DOCUMENT_STATUS.FAILED,
    error?.message || "Document indexing failed.",
  );
}

export function toSafeIndexingStatus(document = {}) {
  return {
    documentId: document._id ? String(document._id) : document.id ? String(document.id) : null,
    status: document.status || null,
    statusMessage: sanitizeStatusMessage(document.statusMessage),
    contentStats: document.contentStats || null,
  };
}
