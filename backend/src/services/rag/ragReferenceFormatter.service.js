import { DEMO_LIMITS } from "../../config/limits.js";

const MAX_REFERENCE_EXCERPT_CHARS = 300;

function serializeId(value) {
  if (!value) {
    return null;
  }

  return String(value);
}

function serializeLocator(reference = {}) {
  return [
    reference.sectionTitle,
    reference.pageNumber,
    reference.slideNumber,
    reference.sheetName,
    reference.rowRange,
    reference.mediaTimestamp,
  ]
    .filter((value) => value !== undefined && value !== null && value !== "")
    .map(String)
    .join("|");
}

function capText(text = "", max = MAX_REFERENCE_EXCERPT_CHARS) {
  return String(text || "").slice(0, max);
}

function normalizeTextKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function referenceKey(reference = {}) {
  const documentId = serializeId(reference.documentId) || "unknown_document";
  const chunkId = serializeId(reference.chunkId);
  if (chunkId) {
    return `${documentId}:chunk:${chunkId}`;
  }

  const locator = serializeLocator(reference);
  const excerpt = capText(reference.excerptPreview, 120).trim();
  return `${documentId}:locator:${locator}:excerpt:${excerpt}`;
}

function sourceReferenceKey(reference = {}) {
  const documentId = serializeId(reference.documentId);
  if (documentId) {
    return `document:${documentId}`;
  }

  const title = normalizeTextKey(reference.documentTitle);
  const fileType = normalizeTextKey(reference.fileType);
  const folderName = normalizeTextKey(reference.folderName);
  if (title || fileType || folderName) {
    return `source:${folderName}:${title}:${fileType}`;
  }

  return referenceKey(reference);
}

function mergeExcerptPreview(existing = "", next = "") {
  const parts = [existing, next]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const unique = [];
  const seen = new Set();

  for (const part of parts) {
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(part);
  }

  return capText(unique.join("\n\n"));
}

function mergeSourceReference(existing = {}, next = {}) {
  const currentScore =
    typeof existing.similarityScore === "number" ? existing.similarityScore : null;
  const nextScore = typeof next.similarityScore === "number" ? next.similarityScore : null;

  return {
    ...existing,
    excerptPreview: mergeExcerptPreview(existing.excerptPreview, next.excerptPreview),
    similarityScore:
      currentScore == null
        ? nextScore
        : nextScore == null
          ? currentScore
          : Math.max(currentScore, nextScore),
  };
}

function expandCitationToken(token = "") {
  const ranges = String(token)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const numbers = [];

  for (const range of ranges) {
    const rangeMatch = /^(\d+)\s*[-–—]\s*(\d+)$/.exec(range);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (Number.isInteger(start) && Number.isInteger(end)) {
        const low = Math.min(start, end);
        const high = Math.max(start, end);
        for (let value = low; value <= high; value += 1) {
          numbers.push(value);
        }
      }
      continue;
    }

    const single = Number(range);
    if (Number.isInteger(single) && single > 0) {
      numbers.push(single);
    }
  }

  return numbers;
}

export function extractCitationNumbersFromAnswer(answerText = "") {
  const cited = [];
  const seen = new Set();
  const pattern = /\[((?:\s*\d+\s*(?:[-–—]\s*\d+\s*)?)(?:,\s*\d+\s*(?:[-–—]\s*\d+\s*)?)*)\]/g;
  let match;

  while ((match = pattern.exec(String(answerText || ""))) !== null) {
    for (const number of expandCitationToken(match[1])) {
      if (!seen.has(number)) {
        seen.add(number);
        cited.push(number);
      }
    }
  }

  return cited;
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
  answerText = "",
} = {}) {
  const bySource = new Map();

  for (const reference of references) {
    const key = sourceReferenceKey(reference);
    if (!key) {
      continue;
    }

    const existing = bySource.get(key);
    bySource.set(key, existing ? mergeSourceReference(existing, reference) : reference);
  }

  const formatted = Array.from(bySource.values()).map((reference, index) =>
    toChatReference(reference, index + 1),
  );

  const citedNumbers = extractCitationNumbersFromAnswer(answerText);
  const byCitation = new Map(formatted.map((reference) => [reference.citationNumber, reference]));
  const allCitedHaveMetadata =
    citedNumbers.length > 0 && citedNumbers.every((number) => byCitation.has(number));

  if (allCitedHaveMetadata) {
    const cited = citedNumbers
      .map((number) => byCitation.get(number))
      .filter(Boolean);
    const citedSet = new Set(cited.map((reference) => reference.citationNumber));
    const remaining = formatted.filter((reference) => !citedSet.has(reference.citationNumber));

    return [...cited, ...remaining].slice(0, visibleLimit);
  }

  return formatted.slice(0, visibleLimit);
}
