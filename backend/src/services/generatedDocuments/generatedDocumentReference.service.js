import {
  GENERATED_DOCUMENT_LIMITS,
} from "../../constants/generatedDocument.constants.js";

const SECRETISH_PATTERN = /(api[_-]?key|secret|token|password)\s*[:=]\s*[^\s,;]+/gi;
const WINDOWS_PATH_PATTERN = /[A-Za-z]:\\[^\s"'<>]+/g;
const POSIX_ABSOLUTE_PATH_PATTERN = /\/(?:Users|home|tmp|var|etc|mnt)\/[^\s"'<>]+/g;
const STORAGE_KEY_PATTERN = /\b(?:mock|demo-sessions)\/[^\s"'<>]+/g;

function serializeId(value) {
  if (!value) {
    return null;
  }

  return String(value);
}

function capText(text = "", limit = GENERATED_DOCUMENT_LIMITS.maxReferenceExcerptChars) {
  const value = String(text || "")
    .replace(SECRETISH_PATTERN, "$1=[redacted]")
    .replace(WINDOWS_PATH_PATTERN, "[local-path]")
    .replace(POSIX_ABSOLUTE_PATH_PATTERN, "[local-path]")
    .replace(STORAGE_KEY_PATTERN, "[storage-key]")
    .replace(/\s+/g, " ")
    .trim();

  return value.length > limit ? `${value.slice(0, Math.max(0, limit - 1))}...` : value;
}

function referenceKey(reference = {}) {
  return [
    serializeId(reference.documentId) || "document",
    serializeId(reference.chunkId) || reference.sectionTitle || reference.excerptPreview || "chunk",
  ].join("::");
}

function toSafeReference(reference = {}, citationNumber) {
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
    similarityScore: Number.isFinite(reference.similarityScore)
      ? reference.similarityScore
      : null,
    usedFor: "generated document source",
  };
}

function collectMessageId(message = {}) {
  return serializeId(message.id || message._id);
}

export function collectGeneratedDocumentReferences({
  messages = [],
  includeReferences = true,
  maxReferences = GENERATED_DOCUMENT_LIMITS.maxReferenceCount,
} = {}) {
  const sourceMessageIds = messages.map(collectMessageId).filter(Boolean);
  if (!includeReferences) {
    return {
      references: [],
      sourceMessageIds,
      sourceDocumentIds: [],
      promptReferences: [],
    };
  }

  const byKey = new Map();
  for (const message of messages) {
    for (const reference of message.referencesUsed || []) {
      const key = referenceKey(reference);
      if (!byKey.has(key)) {
        byKey.set(key, reference);
      }
    }
  }

  const references = [...byKey.values()]
    .slice(0, maxReferences)
    .map((reference, index) => toSafeReference(reference, index + 1));
  const sourceDocumentIds = [
    ...new Set(references.map((reference) => reference.documentId).filter(Boolean)),
  ];
  const promptReferences = references.map((reference) => {
    const location = [
      reference.pageNumber ? `page ${reference.pageNumber}` : null,
      reference.slideNumber ? `slide ${reference.slideNumber}` : null,
      reference.sheetName ? `sheet ${reference.sheetName}` : null,
      reference.rowRange ? `rows ${reference.rowRange}` : null,
      reference.mediaTimestamp ? `time ${reference.mediaTimestamp}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    return {
      citationNumber: reference.citationNumber,
      label: `[${reference.citationNumber}] ${reference.documentTitle || "Document"}`,
      documentId: reference.documentId,
      location,
      excerptPreview: reference.excerptPreview,
    };
  });

  return {
    references,
    sourceMessageIds,
    sourceDocumentIds,
    promptReferences,
  };
}
