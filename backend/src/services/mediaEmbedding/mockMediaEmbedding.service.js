import { createHttpError } from "../../utils/httpError.js";
import { toMockDocumentId, toMockFolderId } from "../../utils/ids.js";
import { DOCUMENT_SCOPE, DOCUMENT_STATUS, SOURCE_TYPE } from "../../constants/document.constants.js";
import { LIFECYCLE_STATUS } from "../../constants/lifecycle.constants.js";
import { MEDIA_EMBEDDING_ERROR_CODE } from "../../constants/mediaEmbedding.constants.js";
import {
  findMockManifestDocument,
  loadMockManifest,
} from "../mockData/mockManifest.service.js";
import { validateMockAsset } from "../mockData/mockAsset.service.js";
import {
  findPersistentMockDocumentByMockId,
  updateDocumentMediaMeta,
} from "../indexing/documentIndexing.repository.js";
import {
  countDirectMediaChunksForDocument,
  findDirectMediaChunkForDocument,
  insertChunksForDocument,
} from "../indexing/documentChunk.repository.js";
import { isDirectMediaFileKind } from "./mediaEmbeddingTypes.service.js";
import { embedMediaDocument } from "./mediaEmbeddingPipeline.service.js";

function toManifestSlug(document) {
  return `${document.folderSlug}/${document.filename}`;
}

function buildManifestMockDocument(document, asset) {
  const slug = toManifestSlug(document);
  return {
    id: toMockDocumentId(slug),
    mockId: toMockDocumentId(slug),
    manifestPath: document.relativePath || slug,
    folderId: toMockFolderId(document.folderSlug),
    demoSessionId: null,
    scope: DOCUMENT_SCOPE.MOCK,
    sourceType: SOURCE_TYPE.MOCK,
    title: document.title,
    originalFilename: document.filename,
    downloadFilename: document.filename,
    fileKind: document.fileKind,
    mimeType: asset.mimeType || document.mimeType,
    status: DOCUMENT_STATUS.READY,
    readOnly: true,
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
    mediaMeta: {
      directMultimodalEmbeddingSeeded: false,
      transcriptDocumentId: null,
      durationSeconds: null,
    },
  };
}

function getRepositories(repositories = {}) {
  const defaultDocumentRepository = {
    findPersistentMockDocumentByMockId,
    updateDocumentMediaMeta,
  };
  const defaultChunkRepository = {
    countDirectMediaChunksForDocument,
    findDirectMediaChunkForDocument,
    insertChunksForDocument,
  };

  return {
    documentRepository: repositories.documentRepository || defaultDocumentRepository,
    chunkRepository: repositories.chunkRepository || defaultChunkRepository,
  };
}

function selectMockMediaDocuments(manifest = {}, documentIdOrSlug = null) {
  if (documentIdOrSlug) {
    const document = findMockManifestDocument(manifest, documentIdOrSlug);
    return document ? [document] : [];
  }

  return (manifest.documents || []).filter((document) => isDirectMediaFileKind(document.fileKind));
}

async function validateManifestMediaAsset(document, manifest = {}) {
  const folder = (manifest.folders || []).find((candidate) => candidate.slug === document.folderSlug) || {};
  try {
    return await validateMockAsset(document, folder);
  } catch (error) {
    if (error.code === "FILE_NOT_FOUND") {
      throw createHttpError(
        404,
        "Mock media asset file was not found.",
        MEDIA_EMBEDDING_ERROR_CODE.MEDIA_ASSET_NOT_FOUND,
      );
    }
    throw createHttpError(
      400,
      "Mock media asset path is invalid.",
      MEDIA_EMBEDDING_ERROR_CODE.MEDIA_ASSET_PATH_INVALID,
    );
  }
}

export async function embedMockMediaDocument({
  documentId,
  mockId,
  slug,
  force = false,
  dryRun = false,
  embedder,
  repositories = {},
  manifestLoader = loadMockManifest,
  embeddedAt = new Date(),
} = {}) {
  const manifest = await manifestLoader();
  const documentIdOrSlug = documentId || mockId || slug;
  const manifestDocument = findMockManifestDocument(manifest, documentIdOrSlug);
  if (!manifestDocument) {
    throw createHttpError(404, "Mock media document was not found.", "MOCK_DOCUMENT_NOT_FOUND");
  }
  if (!isDirectMediaFileKind(manifestDocument.fileKind)) {
    throw createHttpError(
      400,
      "Direct media embedding supports mock image, audio, and video only.",
      MEDIA_EMBEDDING_ERROR_CODE.MEDIA_EMBEDDING_UNSUPPORTED,
    );
  }

  const asset = await validateManifestMediaAsset(manifestDocument, manifest);
  const repo = getRepositories(repositories);
  const mockDocumentId = toMockDocumentId(toManifestSlug(manifestDocument));
  const document = dryRun
    ? buildManifestMockDocument(manifestDocument, asset)
    : await repo.documentRepository.findPersistentMockDocumentByMockId(mockDocumentId);

  if (!document) {
    throw createHttpError(
      503,
      "Persistent mock media metadata is not configured.",
      "PERSISTENCE_NOT_CONFIGURED",
    );
  }

  return embedMediaDocument({
    document,
    asset,
    force,
    dryRun,
    embedder,
    repositories: {
      ...repositories,
      documentRepository: repo.documentRepository,
      chunkRepository: repo.chunkRepository,
    },
    embeddedAt,
  });
}

export async function embedAllMockMediaDocuments({
  force = false,
  dryRun = false,
  documentIdOrSlug = null,
  embedder,
  repositories = {},
  manifestLoader = loadMockManifest,
  continueOnError = false,
  embeddedAt = new Date(),
} = {}) {
  const manifest = await manifestLoader();
  const documents = selectMockMediaDocuments(manifest, documentIdOrSlug);
  if (documents.length === 0) {
    throw createHttpError(404, "Mock media document was not found.", "MOCK_DOCUMENT_NOT_FOUND");
  }

  const results = [];
  const failures = [];

  for (const document of documents) {
    const slug = toManifestSlug(document);
    try {
      results.push(await embedMockMediaDocument({
        slug,
        force,
        dryRun,
        embedder,
        repositories,
        manifestLoader: async () => manifest,
        embeddedAt,
      }));
    } catch (error) {
      failures.push({
        document: slug,
        code: error.code || MEDIA_EMBEDDING_ERROR_CODE.MEDIA_EMBEDDING_PROVIDER_ERROR,
        message: error.message,
      });
      if (!continueOnError) {
        break;
      }
    }
  }

  return {
    status: failures.length > 0 ? (results.length > 0 ? "partial" : "failed") : "completed",
    mode: dryRun ? "dry_run" : "persistent",
    requestedDocument: documentIdOrSlug || null,
    mediaDocumentsSelected: documents.length,
    embeddedDocuments: results.filter((result) => result.status === "completed").length,
    skippedCached: results.filter((result) => result.status === "skipped_cached").length,
    planned: results.filter((result) => result.status === "planned").length,
    failures,
    results,
  };
}
