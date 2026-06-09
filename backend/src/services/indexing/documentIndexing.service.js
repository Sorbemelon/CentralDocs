import {
  DOCUMENT_SCOPE,
  DOCUMENT_STATUS,
  SOURCE_TYPE,
} from "../../constants/document.constants.js";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "../../constants/embedding.constants.js";
import { LIFECYCLE_STATUS } from "../../constants/lifecycle.constants.js";
import { createHttpError, HttpError } from "../../utils/httpError.js";
import { toMockDocumentId, toMockFolderId } from "../../utils/ids.js";
import { createChunkDraftsFromExtraction } from "../chunking/chunkingPipeline.service.js";
import { embedChunkDrafts } from "../embedding/embeddingPipeline.service.js";
import { extractMockDocument } from "../extraction/extractionRegistry.service.js";
import {
  findMockManifestDocument,
  loadMockManifest,
} from "../mockData/mockManifest.service.js";
import {
  buildDocumentChunkPayloads,
  countChunksForDocument,
  replaceChunksForDocument,
} from "./documentChunk.repository.js";
import {
  findDocumentForIndexing,
  findPersistentMockDocumentByMockId,
  updateDocumentIndexingStatus,
} from "./documentIndexing.repository.js";
import {
  markChunking,
  markEmbedding,
  markExtracting,
  markFailed,
  markOptimizing,
  markReady,
} from "./documentIndexingStatus.service.js";
import { toIndexingResultDto } from "./indexingResult.dto.js";

function toDocumentId(document = {}) {
  return document._id || document.id || document.documentId || null;
}

function assertIndexableDocument(document = {}, { retry = false } = {}) {
  if (!document || typeof document !== "object") {
    throw createHttpError(404, "Document was not found.", "DOCUMENT_NOT_FOUND");
  }
  if (document.lifecycleStatus === LIFECYCLE_STATUS.TRASHED) {
    throw createHttpError(409, "Trashed documents cannot be indexed.", "DOCUMENT_TRASHED");
  }
  if (document.status === DOCUMENT_STATUS.FAILED && !retry) {
    throw createHttpError(
      409,
      "Failed documents require an explicit retry before indexing.",
      "DOCUMENT_NOT_INDEXABLE",
    );
  }
}

function assertValidExtractionResult(extractionResult = {}) {
  if (!extractionResult || typeof extractionResult !== "object") {
    throw createHttpError(
      400,
      "Extraction result is required for indexing.",
      "EXTRACTION_RESULT_INVALID",
    );
  }
}

function getRepositories(repositories = {}) {
  return {
    documentRepository: repositories.documentRepository || {
      updateDocumentIndexingStatus,
      findDocumentForIndexing,
      findPersistentMockDocumentByMockId,
    },
    chunkRepository: repositories.chunkRepository || {
      countChunksForDocument,
      replaceChunksForDocument,
    },
  };
}

async function updateStatus({
  documentId,
  patch,
  repositories,
  options,
  statusSequence,
}) {
  statusSequence.push(patch.status);
  if (options.dryRun) {
    return null;
  }

  return repositories.documentRepository.updateDocumentIndexingStatus({ documentId, patch });
}

function buildContentStats({ extractionResult = {}, embeddedChunks = [] } = {}) {
  const stats = extractionResult.stats || {};
  const extractedText = extractionResult.extractedText || "";
  const optimizedText = extractionResult.optimizedText || "";
  const estimatedTokenCount = embeddedChunks.reduce(
    (sum, chunk) => sum + (chunk.tokenEstimate || 0),
    0,
  );

  return {
    extractedCharCount: stats.extractedCharCount ?? extractedText.length,
    optimizedCharCount: stats.optimizedCharCount ?? optimizedText.length,
    estimatedTokenCount: stats.estimatedTokenCount ?? estimatedTokenCount,
    chunkCount: embeddedChunks.length,
  };
}

function toIndexingFailure(error) {
  if (error instanceof HttpError) {
    return error;
  }

  return createHttpError(500, "Document indexing failed.", "INDEXING_FAILED");
}

async function persistChunks({ documentId, chunks, repositories, options }) {
  if (options.dryRun) {
    return {
      status: "dry_run",
      insertedCount: chunks.length,
    };
  }

  const existingCount = repositories.chunkRepository.countChunksForDocument
    ? await repositories.chunkRepository.countChunksForDocument({ documentId })
    : 0;

  if (existingCount > 0 && !options.reindex) {
    throw createHttpError(
      409,
      "Document already has chunks; use reindex to replace them.",
      "DOCUMENT_NOT_INDEXABLE",
    );
  }

  return repositories.chunkRepository.replaceChunksForDocument({ documentId, chunks });
}

export function createDryRunEmbedder({ value = 0.01 } = {}) {
  return async () => ({
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    embedding: Array.from({ length: EMBEDDING_DIMENSIONS }, () => value),
    provider: "gemini",
    keySlot: null,
    warnings: [{ code: "DRY_RUN_EMBEDDER", message: "Dry-run embedding vector was generated locally." }],
  });
}

export async function indexDocumentFromExtraction({
  document,
  extractionResult,
  embedder,
  repositories = {},
  options = {},
} = {}) {
  const repo = getRepositories(repositories);
  const statusSequence = [];
  const indexedAt = options.indexedAt || new Date();
  const documentId = toDocumentId(document);

  assertIndexableDocument(document, options);
  assertValidExtractionResult(extractionResult);

  try {
    await updateStatus({ documentId, patch: markExtracting(), repositories: repo, options, statusSequence });
    await updateStatus({ documentId, patch: markOptimizing(), repositories: repo, options, statusSequence });
    await updateStatus({ documentId, patch: markChunking(), repositories: repo, options, statusSequence });

    const chunkDraftResult = createChunkDraftsFromExtraction(extractionResult, {
      ...options,
      documentId,
      sourceDocumentTitle: document.title,
      fileKind: document.fileKind || extractionResult.fileKind,
      scope: document.scope || extractionResult.scope,
      sourceType: document.sourceType || extractionResult.sourceType,
    });

    await updateStatus({ documentId, patch: markEmbedding(), repositories: repo, options, statusSequence });

    const embeddingResult = await embedChunkDrafts({
      chunks: chunkDraftResult.chunks,
      options: {
        ...options,
        embeddedAt: indexedAt,
        warnings: [...chunkDraftResult.warnings],
      },
      embedder,
    });

    const chunkPayloads = buildDocumentChunkPayloads({
      document,
      embeddedChunks: embeddingResult.chunks,
    });
    const persistence = await persistChunks({
      documentId,
      chunks: chunkPayloads,
      repositories: repo,
      options,
    });
    const contentStats = buildContentStats({
      extractionResult,
      embeddedChunks: embeddingResult.chunks,
    });

    await updateStatus({
      documentId,
      patch: markReady({ contentStats }),
      repositories: repo,
      options,
      statusSequence,
    });

    return {
      ...toIndexingResultDto({
        document,
        contentStats,
        chunkCount: chunkPayloads.length,
        warnings: embeddingResult.warnings,
        aiRouting: embeddingResult.aiRouting,
        indexedAt,
      }),
      persistence: {
        status: options.dryRun ? "dry_run" : "completed",
        insertedCount: persistence.insertedCount ?? chunkPayloads.length,
      },
      statusSequence,
    };
  } catch (error) {
    const safeError = toIndexingFailure(error);
    if (!options.dryRun && documentId && repo.documentRepository.updateDocumentIndexingStatus) {
      await repo.documentRepository.updateDocumentIndexingStatus({
        documentId,
        patch: markFailed({ error: safeError }),
      });
    }
    throw safeError;
  }
}

function buildManifestMockDocument(manifestDocument = {}) {
  const slug = `${manifestDocument.folderSlug}/${manifestDocument.filename}`;
  return {
    id: toMockDocumentId(slug),
    mockId: toMockDocumentId(slug),
    manifestPath: manifestDocument.relativePath || slug,
    folderId: toMockFolderId(manifestDocument.folderSlug),
    demoSessionId: null,
    scope: DOCUMENT_SCOPE.MOCK,
    sourceType: SOURCE_TYPE.MOCK,
    title: manifestDocument.title,
    originalFilename: manifestDocument.filename,
    downloadFilename: manifestDocument.filename,
    fileKind: manifestDocument.fileKind,
    status: DOCUMENT_STATUS.READY,
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
    mediaMeta: manifestDocument.indexingMode ? {
      directMultimodalEmbeddingSeeded: manifestDocument.indexingMode === "direct_multimodal_seed_cached",
    } : null,
  };
}

export async function indexMockDocument({
  manifestDocumentId,
  slug,
  embedder,
  repositories = {},
  options = {},
} = {}) {
  const manifest = await (options.manifestLoader || loadMockManifest)();
  const documentIdOrSlug = manifestDocumentId || slug;
  const manifestDocument = findMockManifestDocument(manifest, documentIdOrSlug);
  if (!manifestDocument) {
    throw createHttpError(404, "Mock document was not found.", "MOCK_DOCUMENT_NOT_FOUND");
  }

  const mockId = toMockDocumentId(`${manifestDocument.folderSlug}/${manifestDocument.filename}`);
  const repo = getRepositories(repositories);
  const document = options.dryRun
    ? buildManifestMockDocument(manifestDocument)
    : await repo.documentRepository.findPersistentMockDocumentByMockId(mockId);

  if (!document) {
    throw createHttpError(
      503,
      "Persistent mock document metadata is not configured for indexing.",
      "PERSISTENCE_NOT_CONFIGURED",
    );
  }

  const extractionResult = await extractMockDocument({ documentIdOrSlug });

  return indexDocumentFromExtraction({
    document,
    extractionResult,
    embedder: embedder || (options.dryRun ? createDryRunEmbedder() : undefined),
    repositories,
    options: {
      ...options,
      reindex: options.reindex ?? true,
      scope: DOCUMENT_SCOPE.MOCK,
      sourceType: SOURCE_TYPE.MOCK,
    },
  });
}

export async function reindexDocument({
  documentId,
  scope = null,
  demoSessionId = null,
  extractionResult = null,
  embedder,
  repositories = {},
  options = {},
} = {}) {
  if (!extractionResult) {
    throw createHttpError(
      400,
      "Reindexing requires an extraction result in this foundation phase.",
      "EXTRACTION_RESULT_INVALID",
    );
  }

  const repo = getRepositories(repositories);
  const document = await repo.documentRepository.findDocumentForIndexing({
    documentId,
    scope,
    demoSessionId,
  });

  return indexDocumentFromExtraction({
    document,
    extractionResult,
    embedder,
    repositories,
    options: {
      ...options,
      reindex: true,
    },
  });
}
