import { SEARCH_LIMITS } from "../../constants/search.constants.js";

function serializeId(value) {
  if (!value) {
    return null;
  }

  return String(value);
}

function capExcerpt(text = "") {
  return String(text || "").slice(0, SEARCH_LIMITS.excerptPreviewChars);
}

function formatRowRange(locator = {}) {
  if (!locator.rowStart && !locator.rowEnd) {
    return null;
  }
  if (locator.rowStart && locator.rowEnd && locator.rowStart !== locator.rowEnd) {
    return `${locator.rowStart}-${locator.rowEnd}`;
  }

  return String(locator.rowStart || locator.rowEnd);
}

function formatMediaTimestamp(locator = {}) {
  if (locator.mediaTimestampStart == null && locator.mediaTimestampEnd == null) {
    return null;
  }
  if (locator.mediaTimestampStart != null && locator.mediaTimestampEnd != null) {
    return `${locator.mediaTimestampStart}-${locator.mediaTimestampEnd}`;
  }

  return String(locator.mediaTimestampStart ?? locator.mediaTimestampEnd);
}

function getDocumentMetadata(match = {}, documentsById = new Map()) {
  return documentsById.get(serializeId(match.documentId)) || {};
}

export function buildSearchReference({ match = {}, document = {}, citationNumber = 1 } = {}) {
  const locator = match.sourceLocator || {};

  return {
    citationNumber,
    documentId: serializeId(document.id || match.documentId),
    documentTitle: document.title || null,
    fileType: document.fileType || document.fileKind || null,
    folderName: document.folderName || null,
    chunkId: serializeId(match.chunkId || match._id || match.id),
    sectionTitle: locator.sectionTitle || null,
    pageNumber: locator.pageNumber ?? null,
    slideNumber: locator.slideNumber ?? null,
    sheetName: locator.sheetName || null,
    rowRange: formatRowRange(locator),
    mediaTimestamp: formatMediaTimestamp(locator),
    excerptPreview: capExcerpt(match.contentPreview || match.content),
    similarityScore: typeof match.score === "number" ? match.score : null,
    usedFor: "semantic search match",
  };
}

export function buildSearchReferences({ matches = [], documentsById = new Map() } = {}) {
  return matches.map((match, index) =>
    buildSearchReference({
      match,
      document: getDocumentMetadata(match, documentsById),
      citationNumber: index + 1,
    }),
  );
}
