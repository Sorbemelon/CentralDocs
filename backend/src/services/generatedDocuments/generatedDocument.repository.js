import mongoose from "mongoose";
import {
  DOCUMENT_SCOPE,
  DOCUMENT_STATUS,
  FILE_KIND,
  SOURCE_TYPE,
  STORAGE_PROVIDER,
} from "../../constants/document.constants.js";
import {
  GENERATED_DOCUMENT_ERROR_CODE,
  GENERATED_DOCUMENT_LIMITS,
} from "../../constants/generatedDocument.constants.js";
import { LIFECYCLE_STATUS } from "../../constants/lifecycle.constants.js";
import { isMongoConnected } from "../../db/connectMongo.js";
import { Document } from "../../models/Document.model.js";
import { createHttpError } from "../../utils/httpError.js";

function requirePersistence() {
  if (!isMongoConnected()) {
    throw createHttpError(
      503,
      "MongoDB persistence is required to save generated documents.",
      GENERATED_DOCUMENT_ERROR_CODE.PERSISTENCE_NOT_CONFIGURED,
    );
  }
}

function serializeObjectIdIfValid(value) {
  const stringValue = String(value || "");
  return mongoose.Types.ObjectId.isValid(stringValue) ? stringValue : null;
}

function safeTitleFromFilename(filename = "generated-document.md") {
  const withoutExtension = filename.replace(/\.[^.]+$/, "");
  const normalized = withoutExtension.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return normalized || "Generated document";
}

export function createGeneratedDocumentId() {
  return new mongoose.Types.ObjectId().toString();
}

export function buildGeneratedDocumentPayload({
  documentId = createGeneratedDocumentId(),
  demoSessionId,
  chatId,
  filenameMeta,
  objectKey,
  sizeBytes,
  content,
  generatedMeta = {},
  expiresAt = null,
} = {}) {
  const fileExtension = filenameMeta.extension;

  return {
    _id: documentId,
    demoSessionId,
    folderId: null,
    scope: DOCUMENT_SCOPE.GENERATED,
    sourceType: SOURCE_TYPE.GENERATED,
    title: safeTitleFromFilename(filenameMeta.filename),
    originalFilename: filenameMeta.filename,
    downloadFilename: filenameMeta.downloadFilename,
    fileExtension,
    mimeType: filenameMeta.mimeType,
    fileKind:
      fileExtension === "txt" ? FILE_KIND.TEXT : FILE_KIND.MARKDOWN,
    storageProvider: STORAGE_PROVIDER.S3,
    objectKey,
    sizeBytes,
    status: DOCUMENT_STATUS.READY,
    statusMessage: null,
    extractedTextPreview: String(content || "").slice(
      0,
      GENERATED_DOCUMENT_LIMITS.previewChars,
    ),
    contentStats: {
      extractedCharCount: String(content || "").length,
      optimizedCharCount: String(content || "").length,
      estimatedTokenCount: Math.ceil(String(content || "").length / 4),
      chunkCount: 0,
    },
    generatedMeta: {
      fromChatSessionId: serializeObjectIdIfValid(chatId),
      generationInstruction: generatedMeta.generationInstruction || null,
      sourceMessageIds: (generatedMeta.sourceMessageIds || [])
        .map(serializeObjectIdIfValid)
        .filter(Boolean),
      sourceDocumentIds: [...new Set(generatedMeta.sourceDocumentIds || [])].map(String),
      referencesIncluded: Boolean(generatedMeta.referencesIncluded),
    },
    readOnly: false,
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
    expiresAt,
  };
}

export async function createGeneratedDocumentRecord(payload) {
  requirePersistence();
  return Document.create(payload);
}

export async function countGeneratedDocumentsByDemoSession({ demoSessionId } = {}) {
  requirePersistence();
  return Document.countDocuments({
    demoSessionId,
    scope: DOCUMENT_SCOPE.GENERATED,
    sourceType: SOURCE_TYPE.GENERATED,
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
  });
}

export async function updateGeneratedDocumentIndexingFields({
  documentId,
  demoSessionId,
  patch = {},
} = {}) {
  requirePersistence();
  return Document.findOneAndUpdate(
    { _id: documentId, demoSessionId },
    { $set: patch },
    { new: true, lean: true },
  );
}

export function createMemoryGeneratedDocumentRepository({ seed = [] } = {}) {
  const documents = new Map();
  let counter = 0;

  function clone(document) {
    return document ? { ...document, generatedMeta: { ...(document.generatedMeta || {}) } } : null;
  }

  for (const document of seed) {
    const id = String(document.id || document._id || `generated_${++counter}`);
    documents.set(id, { _id: id, ...document });
  }

  return {
    createDocumentId() {
      return `generated_${++counter}`;
    },
    async createGeneratedDocumentRecord(payload) {
      const id = String(payload._id || `generated_${++counter}`);
      const record = {
        ...payload,
        _id: id,
        id,
        createdAt: payload.createdAt || new Date(),
        updatedAt: payload.updatedAt || new Date(),
      };
      documents.set(id, record);
      return clone(record);
    },
    async countGeneratedDocumentsByDemoSession({ demoSessionId } = {}) {
      return [...documents.values()].filter(
        (document) =>
          document.demoSessionId === demoSessionId &&
          document.scope === DOCUMENT_SCOPE.GENERATED &&
          document.sourceType === SOURCE_TYPE.GENERATED &&
          document.lifecycleStatus !== LIFECYCLE_STATUS.TRASHED,
      ).length;
    },
    async updateGeneratedDocumentIndexingFields({ documentId, patch = {} } = {}) {
      const record = documents.get(String(documentId));
      if (!record) {
        return null;
      }
      Object.assign(record, patch, { updatedAt: new Date() });
      return clone(record);
    },
    _unsafeSnapshot() {
      return [...documents.values()].map(clone);
    },
  };
}
