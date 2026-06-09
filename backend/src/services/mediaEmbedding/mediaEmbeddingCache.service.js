import {
  CHUNK_KIND,
  EMBEDDING_INPUT_TYPE,
  MEDIA_EMBEDDING_CHUNK_INDEX,
  MEDIA_EMBEDDING_DIMENSIONS,
  MEDIA_EMBEDDING_MODEL,
} from "../../constants/mediaEmbedding.constants.js";
import { LIFECYCLE_STATUS } from "../../constants/lifecycle.constants.js";
import { buildDocumentChunkPayload } from "../indexing/documentChunk.repository.js";
import { buildMediaEmbeddingLabel, getMediaInputType } from "./mediaEmbeddingTypes.service.js";

function toDocumentId(document = {}) {
  return document._id || document.id || document.documentId || null;
}

export function buildDirectMediaChunkCacheQuery({ documentId }) {
  return {
    documentId,
    chunkKind: CHUNK_KIND.MEDIA_DIRECT,
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
  };
}

export async function findCachedDirectMediaEmbedding({ document, repository } = {}) {
  const documentId = toDocumentId(document);
  if (!documentId || !repository?.findDirectMediaChunkForDocument) {
    return null;
  }

  return repository.findDirectMediaChunkForDocument({ documentId });
}

export async function shouldSkipCachedMediaEmbedding({ document, force = false, repository } = {}) {
  if (force) {
    return { skip: false, cachedChunk: null };
  }

  const cachedChunk = await findCachedDirectMediaEmbedding({ document, repository });
  return {
    skip: Boolean(cachedChunk),
    cachedChunk,
  };
}

export function buildDirectMediaChunkPayload({
  document,
  mediaEmbeddingResult,
  asset,
  chunkIndex = MEDIA_EMBEDDING_CHUNK_INDEX,
  embeddedAt = new Date(),
} = {}) {
  const inputType = mediaEmbeddingResult.inputType || getMediaInputType(document.fileKind);
  return buildDocumentChunkPayload({
    document,
    embeddedChunk: {
      documentId: toDocumentId(document),
      folderId: document.folderId || null,
      scope: "mock",
      chunkIndex,
      content: buildMediaEmbeddingLabel(document),
      embedding: mediaEmbeddingResult.embedding,
      embeddingModel: MEDIA_EMBEDDING_MODEL,
      embeddingDimensions: MEDIA_EMBEDDING_DIMENSIONS,
      tokenEstimate: 0,
      sourceLocator: {},
      chunkKind: CHUNK_KIND.MEDIA_DIRECT,
      embeddingInputType: inputType,
      mediaMeta: {
        directMultimodal: true,
        seededAt: embeddedAt,
        sourceMimeType: mediaEmbeddingResult.mimeType || asset?.mimeType || null,
        sourceFilename: asset?.filename || document.originalFilename || document.filename || null,
      },
    },
  });
}

export function buildDocumentMediaMetaPatch({
  currentMediaMeta = {},
  chunk = null,
  mediaEmbeddingResult = {},
  embeddedAt = new Date(),
} = {}) {
  return {
    ...(currentMediaMeta || {}),
    directMultimodalEmbeddingSeeded: true,
    directMultimodalEmbeddedAt: embeddedAt,
    directMultimodalChunkId: chunk?._id || chunk?.id || null,
    directMultimodalEmbeddingModel: mediaEmbeddingResult.model || MEDIA_EMBEDDING_MODEL,
    directMultimodalEmbeddingDimensions: mediaEmbeddingResult.dimensions || MEDIA_EMBEDDING_DIMENSIONS,
  };
}

export async function updateDocumentDirectMediaCache({
  document,
  chunk,
  mediaEmbeddingResult,
  repository,
  embeddedAt = new Date(),
} = {}) {
  if (!repository?.updateDocumentMediaMeta) {
    return null;
  }

  const mediaMeta = buildDocumentMediaMetaPatch({
    currentMediaMeta: document.mediaMeta,
    chunk,
    mediaEmbeddingResult,
    embeddedAt,
  });

  return repository.updateDocumentMediaMeta({
    documentId: toDocumentId(document),
    mediaMeta,
  });
}
