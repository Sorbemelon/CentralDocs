import { EXTRACTION_LIMITS } from "../../constants/extraction.constants.js";

export function createExtractionWarnings(initialWarnings = []) {
  return [...initialWarnings].filter(Boolean);
}

export function appendWarning(warnings, code, message, details = undefined) {
  warnings.push({
    code,
    message,
    ...(details ? { details } : {}),
  });
}

export function truncateText(text = "", maxChars = EXTRACTION_LIMITS.maxOptimizedTextChars) {
  const value = String(text || "");
  if (value.length <= maxChars) {
    return {
      text: value,
      truncated: false,
    };
  }

  return {
    text: value.slice(0, maxChars).trimEnd(),
    truncated: true,
  };
}

export function createTextPreview(text = "", maxChars = EXTRACTION_LIMITS.maxPreviewChars) {
  return truncateText(text, maxChars).text;
}

export function capSourceBlocks(sourceBlocks = [], warnings = []) {
  if (sourceBlocks.length <= EXTRACTION_LIMITS.maxSourceBlocksPerFile) {
    return {
      sourceBlocks,
      truncated: false,
    };
  }

  appendWarning(
    warnings,
    "SOURCE_BLOCKS_TRUNCATED",
    `Source blocks were limited to ${EXTRACTION_LIMITS.maxSourceBlocksPerFile}.`,
  );

  return {
    sourceBlocks: sourceBlocks.slice(0, EXTRACTION_LIMITS.maxSourceBlocksPerFile),
    truncated: true,
  };
}

export function getTableRowLimit(limit = EXTRACTION_LIMITS.maxTableRowsPerSheet) {
  return Math.max(0, Number.isFinite(Number(limit)) ? Number(limit) : EXTRACTION_LIMITS.maxTableRowsPerSheet);
}

export function getSheetLimit(limit = EXTRACTION_LIMITS.maxXlsxSheets) {
  return Math.max(1, Number.isFinite(Number(limit)) ? Number(limit) : EXTRACTION_LIMITS.maxXlsxSheets);
}

export function getSlideLimit(limit = EXTRACTION_LIMITS.maxPptxSlides) {
  return Math.max(1, Number.isFinite(Number(limit)) ? Number(limit) : EXTRACTION_LIMITS.maxPptxSlides);
}
