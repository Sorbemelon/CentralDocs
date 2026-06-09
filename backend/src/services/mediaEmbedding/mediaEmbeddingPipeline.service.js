import {
  MEDIA_EMBEDDING_CHUNK_INDEX,
  MEDIA_EMBEDDING_ERROR_CODE,
} from "../../constants/mediaEmbedding.constants.js";
import { createHttpError, HttpError } from "../../utils/httpError.js";
import { validateEmbeddingVector } from "../embedding/embeddingVector.service.js";
import { embedMediaFile } from "../ai/geminiMultimodalEmbedding.service.js";
import { insertChunksForDocument } from "../indexing/documentChunk.repository.js";
import { updateDocumentMediaMeta } from "../indexing/documentIndexing.repository.js";
import {
  assertMockMediaDocument,
  getMediaInputType,
} from "./mediaEmbeddingTypes.service.js";
import {
  buildDirectMediaChunkPayload,
  shouldSkipCachedMediaEmbedding,
  updateDocumentDirectMediaCache,
} from "./mediaEmbeddingCache.service.js";
import { toMediaEmbeddingResultDto } from "./mediaEmbeddingResult.dto.js";

function toDocumentId(document = {}) {
  return document._id || document.id || document.documentId || null;
}

function getRepositories(repositories = {}) {
  return {
    chunkRepository: repositories.chunkRepository || {
      insertChunksForDocument,
    },
    documentRepository: repositories.documentRepository || {
      updateDocumentMediaMeta,
    },
  };
}

function toMediaEmbeddingFailure(error) {
  if (error instanceof HttpError) {
    return error;
  }
  if (error?.code === MEDIA_EMBEDDING_ERROR_CODE.AI_RATE_LIMIT_EXHAUSTED) {
    return createHttpError(
      error.statusCode || 429,
      "All media embedding key slots are rate limited.",
      MEDIA_EMBEDDING_ERROR_CODE.AI_RATE_LIMIT_EXHAUSTED,
    );
  }

  return createHttpError(
    500,
    "Mock media embedding failed.",
    MEDIA_EMBEDDING_ERROR_CODE.MEDIA_EMBEDDING_PROVIDER_ERROR,
  );
}

export async function embedMediaDocument({
  document,
  asset,
  force = false,
  dryRun = false,
  embedder = embedMediaFile,
  repositories = {},
  embeddedAt = new Date(),
} = {}) {
  const repo = getRepositories(repositories);
  assertMockMediaDocument(document);
  const inputType = getMediaInputType(document.fileKind);
  const documentId = toDocumentId(document);

  if (dryRun) {
    return toMediaEmbeddingResultDto({
      document,
      status: "planned",
      cached: false,
      dryRun: true,
      inputType,
      warnings: [{ code: "DRY_RUN", message: "Direct media embedding was not executed." }],
      embeddedAt,
    });
  }

  const cache = await shouldSkipCachedMediaEmbedding({
    document,
    force,
    repository: repo.chunkRepository,
  });
  if (cache.skip) {
    return toMediaEmbeddingResultDto({
      document,
      status: "skipped_cached",
      cached: true,
      dryRun,
      chunk: cache.cachedChunk,
      inputType,
      embeddedAt: cache.cachedChunk?.mediaMeta?.seededAt || embeddedAt,
    });
  }

  try {
    const mediaEmbeddingResult = await embedder({
      filePath: asset.localPath,
      mimeType: asset.mimeType || document.mimeType,
      title: document.title,
    });
    validateEmbeddingVector(mediaEmbeddingResult.embedding);
    const chunkPayload = buildDirectMediaChunkPayload({
      document,
      mediaEmbeddingResult,
      asset,
      chunkIndex: MEDIA_EMBEDDING_CHUNK_INDEX,
      embeddedAt,
    });
    const inserted = await repo.chunkRepository.insertChunksForDocument({
      documentId,
      chunks: [chunkPayload],
    });
    const chunk = inserted.chunks?.[0] || chunkPayload;

    await updateDocumentDirectMediaCache({
      document,
      chunk,
      mediaEmbeddingResult,
      repository: repo.documentRepository,
      embeddedAt,
    });

    return toMediaEmbeddingResultDto({
      document,
      status: "completed",
      cached: false,
      dryRun: false,
      chunk,
      inputType,
      warnings: mediaEmbeddingResult.warnings || [],
      embeddedAt,
    });
  } catch (error) {
    throw toMediaEmbeddingFailure(error);
  }
}
