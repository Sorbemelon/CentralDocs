import { EXTRACTION_LIMITS } from "../../constants/extraction.constants.js";
import { capSourceBlocks, createTextPreview } from "./extractionLimit.service.js";
import { estimateTokensFromText, normalizeExtractedText } from "./normalizeText.service.js";

function getWarningsCount(warnings = []) {
  return warnings.length;
}

export function makeSourceBlock({
  blockIndex,
  blockType = "text",
  text = "",
  locator = {},
  metadata = {},
} = {}) {
  return {
    blockIndex,
    blockType,
    text,
    locator,
    metadata,
  };
}

export function buildExtractionResult({
  title,
  fileKind,
  originalFilename,
  extractedText,
  optimizedText = null,
  sourceBlocks = [],
  warnings = [],
  truncated = false,
} = {}) {
  const safeWarnings = [...warnings];
  const normalized = optimizedText
    ? {
        text: optimizedText,
        truncated: optimizedText.length > EXTRACTION_LIMITS.maxOptimizedTextChars,
        estimatedTokenCount: estimateTokensFromText(optimizedText),
      }
    : normalizeExtractedText(extractedText, { warnings: safeWarnings });

  const cappedBlocks = capSourceBlocks(sourceBlocks, safeWarnings);
  const finalTruncated = Boolean(truncated || normalized.truncated || cappedBlocks.truncated);
  const preview = createTextPreview(normalized.text);

  return {
    title,
    fileKind,
    originalFilename,
    extractedText: String(extractedText || ""),
    optimizedText: normalized.text,
    textPreview: preview,
    sourceBlocks: cappedBlocks.sourceBlocks,
    stats: {
      extractedCharCount: String(extractedText || "").length,
      optimizedCharCount: normalized.text.length,
      estimatedTokenCount: normalized.estimatedTokenCount,
      sourceBlockCount: cappedBlocks.sourceBlocks.length,
      truncated: finalTruncated,
      warningsCount: getWarningsCount(safeWarnings),
    },
    warnings: safeWarnings,
  };
}
