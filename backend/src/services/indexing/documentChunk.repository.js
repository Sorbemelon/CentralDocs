import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "../../constants/embedding.constants.js";
import { DOCUMENT_SCOPE } from "../../constants/document.constants.js";
import { LIFECYCLE_STATUS } from "../../constants/lifecycle.constants.js";
import { isMongoConnected } from "../../db/connectMongo.js";
import { DocumentChunk } from "../../models/DocumentChunk.model.js";
import { createHttpError } from "../../utils/httpError.js";
import { buildRestorePatch, buildSoftDeletePatch } from "../lifecycle/softDelete.service.js";

function requirePersistence() {
  if (!isMongoConnected()) {
    throw createHttpError(
      503,
      "MongoDB persistence is not configured for document chunks.",
      "PERSISTENCE_NOT_CONFIGURED",
    );
  }
}

function toId(value) {
  return value?._id || value?.id || value || null;
}

function sanitizeLocator(locator = {}) {
  return {
    pageNumber: locator.pageNumber ?? null,
    slideNumber: locator.slideNumber ?? null,
    sheetName: locator.sheetName ?? null,
    rowStart: locator.rowStart ?? null,
    rowEnd: locator.rowEnd ?? null,
    sectionTitle: locator.sectionTitle ?? null,
    mediaTimestampStart: locator.mediaTimestampStart ?? null,
    mediaTimestampEnd: locator.mediaTimestampEnd ?? null,
  };
}

export function isDocumentChunkPersistenceAvailable() {
  return isMongoConnected();
}

export function buildDocumentChunkPayload({ document = {}, embeddedChunk = {} } = {}) {
  const documentId = toId(document._id || document.id || embeddedChunk.documentId);
  if (!documentId) {
    throw createHttpError(
      400,
      "Document chunk payload requires a document ID.",
      "CHUNK_PERSISTENCE_FAILED",
    );
  }

  return {
    documentId,
    demoSessionId: document.demoSessionId || embeddedChunk.demoSessionId || null,
    folderId: document.folderId || embeddedChunk.folderId || null,
    scope: document.scope || embeddedChunk.scope || DOCUMENT_SCOPE.USER,
    chunkIndex: embeddedChunk.chunkIndex,
    content: embeddedChunk.content,
    embedding: embeddedChunk.embedding,
    embeddingModel: embeddedChunk.embeddingModel || EMBEDDING_MODEL,
    embeddingDimensions: embeddedChunk.embeddingDimensions || EMBEDDING_DIMENSIONS,
    tokenEstimate: embeddedChunk.tokenEstimate || 0,
    sourceLocator: sanitizeLocator(embeddedChunk.sourceLocator),
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
  };
}

export function buildDocumentChunkPayloads({ document = {}, embeddedChunks = [] } = {}) {
  return embeddedChunks.map((embeddedChunk) =>
    buildDocumentChunkPayload({ document, embeddedChunk }),
  );
}

export async function replaceChunksForDocument({ documentId, chunks = [] } = {}) {
  requirePersistence();
  await DocumentChunk.deleteMany({ documentId });
  if (chunks.length === 0) {
    return { deletedExisting: true, insertedCount: 0, chunks: [] };
  }

  const inserted = await DocumentChunk.insertMany(chunks, { ordered: true });
  return {
    deletedExisting: true,
    insertedCount: inserted.length,
    chunks: inserted,
  };
}

export async function deleteChunksForDocument({ documentId } = {}) {
  requirePersistence();
  const result = await DocumentChunk.deleteMany({ documentId });
  return { deletedCount: result.deletedCount || 0 };
}

export async function listChunksForDocument({ documentId, includeTrash = false } = {}) {
  requirePersistence();
  const filter = { documentId };
  if (!includeTrash) {
    filter.lifecycleStatus = LIFECYCLE_STATUS.ACTIVE;
  }
  return DocumentChunk.find(filter).sort({ chunkIndex: 1 }).lean();
}

export async function countChunksForDocument({ documentId } = {}) {
  requirePersistence();
  return DocumentChunk.countDocuments({ documentId, lifecycleStatus: LIFECYCLE_STATUS.ACTIVE });
}

export async function softDeleteChunksForDocument({
  documentId,
  demoSessionId = null,
  deleteOperationId,
} = {}) {
  requirePersistence();
  const patch = buildSoftDeletePatch({ demoSessionId, deleteOperationId });
  const result = await DocumentChunk.updateMany(
    { documentId, lifecycleStatus: LIFECYCLE_STATUS.ACTIVE },
    { $set: patch },
  );
  return { modifiedCount: result.modifiedCount || 0, patch };
}

export async function restoreChunksForDocument({ documentId } = {}) {
  requirePersistence();
  const patch = buildRestorePatch({});
  const result = await DocumentChunk.updateMany(
    { documentId, lifecycleStatus: LIFECYCLE_STATUS.TRASHED },
    { $set: patch },
  );
  return { modifiedCount: result.modifiedCount || 0, patch };
}

export function createMemoryDocumentChunkRepository() {
  const state = {
    chunksByDocumentId: new Map(),
    replaceCalls: [],
  };

  return {
    state,
    async countChunksForDocument({ documentId }) {
      return state.chunksByDocumentId.get(String(documentId))?.length || 0;
    },
    async replaceChunksForDocument({ documentId, chunks = [] }) {
      const key = String(documentId);
      state.replaceCalls.push({ documentId, chunks });
      state.chunksByDocumentId.set(key, chunks);
      return { insertedCount: chunks.length, chunks };
    },
    async listChunksForDocument({ documentId }) {
      return state.chunksByDocumentId.get(String(documentId)) || [];
    },
    async deleteChunksForDocument({ documentId }) {
      const key = String(documentId);
      const deletedCount = state.chunksByDocumentId.get(key)?.length || 0;
      state.chunksByDocumentId.delete(key);
      return { deletedCount };
    },
  };
}
