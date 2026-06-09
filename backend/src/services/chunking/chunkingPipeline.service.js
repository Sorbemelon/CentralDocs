import { CHUNKING_ERROR_CODE } from "../../constants/chunking.constants.js";
import { createHttpError, HttpError } from "../../utils/httpError.js";
import { extractMockDocument } from "../extraction/extractionRegistry.service.js";
import { createChunkDraftsFromSourceBlocks } from "./chunkSourceBlocks.service.js";
import { createChunkDraftsFromText } from "./chunkText.service.js";
import {
  assertValidExtractionResult,
  getChunkSourceOptions,
} from "./chunkingTypes.service.js";
import { estimateTokensFromText } from "./tokenEstimate.service.js";

function safeChunkingFailure(error) {
  if (error instanceof HttpError) {
    return error;
  }

  return createHttpError(
    500,
    "Document chunk drafting failed.",
    CHUNKING_ERROR_CODE.CHUNKING_FAILED,
  );
}

function buildStats({ chunks, extractionResult, truncated }) {
  const tokenCounts = chunks.map((chunk) => chunk.tokenEstimate);
  const estimatedTokenCount = tokenCounts.reduce((sum, count) => sum + count, 0);

  return {
    chunkCount: chunks.length,
    estimatedTokenCount,
    truncated: Boolean(truncated),
    averageChunkTokens:
      chunks.length > 0 ? Math.round(estimatedTokenCount / chunks.length) : 0,
    maxChunkTokens: tokenCounts.length > 0 ? Math.max(...tokenCounts) : 0,
    sourceBlockCount: Array.isArray(extractionResult.sourceBlocks)
      ? extractionResult.sourceBlocks.length
      : 0,
  };
}

function collectChunkWarnings(chunks = []) {
  return chunks.flatMap((chunk) => chunk.chunkMeta?.warnings || []);
}

export function createChunkDraftsFromExtraction(extractionResult = {}, options = {}) {
  try {
    const validExtraction = assertValidExtractionResult(extractionResult);
    const extractionWarnings = Array.isArray(validExtraction.warnings)
      ? validExtraction.warnings
      : [];
    const sourceOptions = getChunkSourceOptions(validExtraction, options);
    const hasSourceBlocks = Array.isArray(validExtraction.sourceBlocks) &&
      validExtraction.sourceBlocks.some((block) => String(block?.text || "").trim());
    const result = hasSourceBlocks
      ? createChunkDraftsFromSourceBlocks(validExtraction.sourceBlocks, {
          ...sourceOptions,
          ...options,
        })
      : createChunkDraftsFromText(validExtraction.optimizedText, {
          ...sourceOptions,
          ...options,
        });
    const warnings = [
      ...extractionWarnings,
      ...result.warnings,
      ...collectChunkWarnings(result.chunks),
    ];
    const truncated = Boolean(
      result.truncated || validExtraction.stats?.truncated || warnings.some((warning) => /TRUNCATED/.test(warning.code || "")),
    );

    return {
      chunks: result.chunks,
      stats: buildStats({
        chunks: result.chunks,
        extractionResult: validExtraction,
        truncated,
      }),
      warnings,
    };
  } catch (error) {
    throw safeChunkingFailure(error);
  }
}

export async function createChunkDraftsForMockDocument({
  manifestDocumentId,
  slug,
  options = {},
} = {}) {
  const documentIdOrSlug = manifestDocumentId || slug;
  const extractionResult = await extractMockDocument({ documentIdOrSlug });
  const sourceTextTokenCount = estimateTokensFromText(extractionResult.optimizedText || "");

  return createChunkDraftsFromExtraction(extractionResult, {
    ...options,
    documentId: options.documentId || documentIdOrSlug,
    scope: options.scope || "mock",
    sourceType: options.sourceType || "mock",
    sourceTextTokenCount,
  });
}
