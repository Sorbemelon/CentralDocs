import { DEMO_LIMITS } from "../../config/limits.js";

const MAX_REFERENCE_EXCERPT_CHARS = 300;

function serializeId(value) {
  if (!value) {
    return null;
  }

  return String(value);
}

function capText(text = "", max = MAX_REFERENCE_EXCERPT_CHARS) {
  return String(text || "").slice(0, max);
}

function referenceKey(reference = {}) {
  return serializeId(reference.chunkId) || serializeId(reference.documentId);
}

export function toChatReference(reference = {}, citationNumber = 1) {
  return {
    citationNumber,
    documentId: serializeId(reference.documentId),
    documentTitle: reference.documentTitle || null,
    fileType: reference.fileType || null,
    folderName: reference.folderName || null,
    chunkId: serializeId(reference.chunkId),
    sectionTitle: reference.sectionTitle || null,
    pageNumber: reference.pageNumber ?? null,
    slideNumber: reference.slideNumber ?? null,
    sheetName: reference.sheetName || null,
    rowRange: reference.rowRange || null,
    mediaTimestamp: reference.mediaTimestamp || null,
    excerptPreview: capText(reference.excerptPreview),
    similarityScore: typeof reference.similarityScore === "number" ? reference.similarityScore : null,
    usedFor: "chat answer evidence",
  };
}

export function formatReferencesForChatAnswer({
  references = [],
  visibleLimit = DEMO_LIMITS.visibleReferences,
} = {}) {
  const seen = new Set();
  const formatted = [];

  for (const reference of references) {
    const key = referenceKey(reference);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    formatted.push(toChatReference(reference, formatted.length + 1));
    if (formatted.length >= visibleLimit) {
      break;
    }
  }

  return formatted;
}
