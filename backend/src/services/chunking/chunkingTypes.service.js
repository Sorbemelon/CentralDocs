import { CHUNKING_ERROR_CODE } from "../../constants/chunking.constants.js";
import { createHttpError } from "../../utils/httpError.js";

export function assertValidExtractionResult(extractionResult = {}) {
  if (!extractionResult || typeof extractionResult !== "object") {
    throw createHttpError(
      400,
      "Extraction result is required for chunking.",
      CHUNKING_ERROR_CODE.INVALID_EXTRACTION_RESULT,
    );
  }

  const hasBlocks = Array.isArray(extractionResult.sourceBlocks) &&
    extractionResult.sourceBlocks.some((block) => String(block?.text || "").trim());
  const hasText = Boolean(String(extractionResult.optimizedText || "").trim());
  if (!hasBlocks && !hasText) {
    throw createHttpError(
      400,
      "Extraction result does not contain text to chunk.",
      CHUNKING_ERROR_CODE.EMPTY_EXTRACTION_TEXT,
    );
  }

  return extractionResult;
}

export function getChunkSourceOptions(extractionResult = {}, options = {}) {
  return {
    documentId: options.documentId || null,
    sourceDocumentTitle: options.sourceDocumentTitle || extractionResult.title || null,
    fileKind: options.fileKind || extractionResult.fileKind || null,
    scope: options.scope || extractionResult.scope || null,
    sourceType: options.sourceType || extractionResult.sourceType || null,
  };
}
