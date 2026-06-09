import { AI_ROUTING_STATUS } from "../../constants/ai.constants.js";
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_ERROR_CODE,
  EMBEDDING_MODEL,
  EMBEDDING_PROVIDER,
} from "../../constants/embedding.constants.js";
import { createHttpError, HttpError } from "../../utils/httpError.js";
import {
  createChunkDraftsForMockDocument,
  createChunkDraftsFromExtraction,
} from "../chunking/chunkingPipeline.service.js";
import { classifyAiProviderError } from "../ai/aiErrorClassifier.service.js";
import { toAiRoutingAttemptDto } from "../ai/aiRoutingAttempt.dto.js";
import { embedChunkDraft } from "./chunkEmbedding.service.js";

function toSafeAttemptFromError(error, keySlot = null) {
  const classified = classifyAiProviderError(error);
  return toAiRoutingAttemptDto({
    keySlot,
    status: AI_ROUTING_STATUS.FAILED,
    errorType: error?.code || classified.errorType,
    isRateLimit: classified.isRateLimit || error?.code === EMBEDDING_ERROR_CODE.AI_RATE_LIMIT_EXHAUSTED,
  });
}

function buildPipelineResult({ chunks, warnings, aiRouting, failedCount }) {
  return {
    chunks,
    stats: {
      chunkCount: chunks.length,
      embeddedCount: chunks.length,
      failedCount,
      embeddingModel: EMBEDDING_MODEL,
      embeddingDimensions: EMBEDDING_DIMENSIONS,
      provider: EMBEDDING_PROVIDER,
      rateLimitEncountered: aiRouting.some((attempt) => attempt.isRateLimit),
      fallbackUsed: false,
    },
    warnings,
    aiRouting,
  };
}

export async function embedChunkDrafts({
  chunks = [],
  options = {},
  embedder,
} = {}) {
  const embeddedChunks = [];
  const warnings = [...(options.warnings || [])];
  const aiRouting = [];
  let failedCount = 0;

  for (const chunk of chunks) {
    try {
      const embedded = await embedChunkDraft(chunk, {
        embedder,
        taskType: options.taskType,
        keySlot: options.keySlot,
        embeddedAt: options.embeddedAt,
      });
      embeddedChunks.push(embedded);
      aiRouting.push(
        ...(embedded.embeddingMeta?.keySlot !== undefined
          ? [
              toAiRoutingAttemptDto({
                keySlot: embedded.embeddingMeta.keySlot,
                status: AI_ROUTING_STATUS.SUCCESS,
              }),
            ]
          : []),
      );
    } catch (error) {
      failedCount += 1;
      aiRouting.push(toSafeAttemptFromError(error, options.keySlot ?? null));
      if (error instanceof HttpError && error.code === EMBEDDING_ERROR_CODE.AI_RATE_LIMIT_EXHAUSTED) {
        throw error;
      }
      if (!options.continueOnError) {
        throw createHttpError(
          500,
          "Chunk embedding failed.",
          EMBEDDING_ERROR_CODE.CHUNK_EMBEDDING_FAILED,
          { chunkIndex: chunk?.chunkIndex ?? null },
        );
      }
      warnings.push({
        code: EMBEDDING_ERROR_CODE.CHUNK_EMBEDDING_FAILED,
        message: "A chunk could not be embedded.",
        details: { chunkIndex: chunk?.chunkIndex ?? null },
      });
    }
  }

  return buildPipelineResult({
    chunks: embeddedChunks,
    warnings,
    aiRouting,
    failedCount,
  });
}

export async function embedExtractionResult({
  extractionResult,
  options = {},
  embedder,
} = {}) {
  const chunkDraftResult = createChunkDraftsFromExtraction(extractionResult, options);
  const embedded = await embedChunkDrafts({
    chunks: chunkDraftResult.chunks,
    options: {
      ...options,
      warnings: [...(options.warnings || []), ...chunkDraftResult.warnings],
    },
    embedder,
  });

  return {
    ...embedded,
    warnings: embedded.warnings,
  };
}

export async function embedMockDocumentChunks({
  manifestDocumentId,
  slug,
  options = {},
  embedder,
} = {}) {
  const chunkDraftResult = await createChunkDraftsForMockDocument({
    manifestDocumentId,
    slug,
    options,
  });

  return embedChunkDrafts({
    chunks: chunkDraftResult.chunks,
    options: {
      ...options,
      scope: "mock",
      sourceType: "mock",
      warnings: [...(options.warnings || []), ...chunkDraftResult.warnings],
    },
    embedder,
  });
}
