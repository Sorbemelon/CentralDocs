import mongoose from "mongoose";
import {
  DOCUMENT_SCOPE,
  DOCUMENT_STATUS,
  SOURCE_TYPE,
  STORAGE_PROVIDER,
} from "../../constants/document.constants.js";
import { FOLDER_SCOPE } from "../../constants/document.constants.js";
import { LIFECYCLE_STATUS } from "../../constants/lifecycle.constants.js";
import { UPLOAD_ERROR_CODE } from "../../constants/upload.constants.js";
import { isMongoConnected } from "../../db/connectMongo.js";
import { Document } from "../../models/Document.model.js";
import { Folder } from "../../models/Folder.model.js";
import { createHttpError } from "../../utils/httpError.js";

function requirePersistence() {
  if (!isMongoConnected()) {
    throw createHttpError(
      503,
      "MongoDB persistence is required for document uploads.",
      UPLOAD_ERROR_CODE.PERSISTENCE_NOT_CONFIGURED,
    );
  }
}

export function createUploadDocumentId() {
  return new mongoose.Types.ObjectId().toString();
}

export function buildUploadDocumentPayload({
  documentId = createUploadDocumentId(),
  demoSessionId,
  folderId = null,
  filenameMeta,
  validation,
  objectKey,
  expiresAt = null,
} = {}) {
  return {
    _id: documentId,
    demoSessionId,
    folderId: folderId || null,
    scope: DOCUMENT_SCOPE.USER,
    sourceType: SOURCE_TYPE.UPLOAD,
    title: filenameMeta.title,
    originalFilename: filenameMeta.originalFilename,
    downloadFilename: filenameMeta.downloadFilename,
    fileExtension: filenameMeta.fileExtension,
    mimeType: validation.mimeType,
    fileKind: validation.fileKind,
    storageProvider: STORAGE_PROVIDER.S3,
    objectKey,
    sizeBytes: validation.sizeBytes,
    status: DOCUMENT_STATUS.UPLOADED,
    statusMessage: null,
    extractedTextPreview: null,
    contentStats: {
      extractedCharCount: 0,
      optimizedCharCount: 0,
      estimatedTokenCount: 0,
      chunkCount: 0,
    },
    readOnly: false,
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
    expiresAt,
  };
}

export async function findUploadFolderById({ folderId, demoSessionId } = {}) {
  requirePersistence();
  if (!folderId || !mongoose.Types.ObjectId.isValid(String(folderId))) {
    return null;
  }

  return Folder.findOne({ _id: folderId, demoSessionId }).lean();
}

export async function createUploadDocumentRecord(payload) {
  requirePersistence();
  return Document.create(payload);
}

export async function updateUploadDocumentStatus({ documentId, demoSessionId, patch = {} } = {}) {
  requirePersistence();
  if (!mongoose.Types.ObjectId.isValid(String(documentId))) {
    return null;
  }

  return Document.findOneAndUpdate(
    { _id: documentId, demoSessionId },
    { $set: patch },
    { returnDocument: "after", lean: true },
  );
}

export async function findUploadDocumentById({ documentId, demoSessionId } = {}) {
  requirePersistence();
  if (!mongoose.Types.ObjectId.isValid(String(documentId))) {
    return null;
  }

  return Document.findOne({ _id: documentId, demoSessionId }).lean();
}

function clone(record) {
  return record ? JSON.parse(JSON.stringify(record)) : null;
}

export function createMemoryUploadDocumentRepository({ documents = [], folders = [] } = {}) {
  const documentStore = new Map();
  const folderStore = new Map();
  let counter = 0;

  for (const folder of folders) {
    const id = String(folder.id || folder._id);
    folderStore.set(id, { _id: id, id, ...folder });
  }
  for (const document of documents) {
    const id = String(document.id || document._id);
    documentStore.set(id, { _id: id, id, ...document });
  }

  return {
    createDocumentId() {
      counter += 1;
      return `upload_${counter}`;
    },
    async findUploadFolderById({ folderId, demoSessionId }) {
      const folder = folderStore.get(String(folderId));
      if (!folder || folder.demoSessionId !== demoSessionId) {
        return null;
      }
      return clone(folder);
    },
    async createUploadDocumentRecord(payload) {
      const id = String(payload._id || `upload_${++counter}`);
      const record = {
        ...payload,
        _id: id,
        id,
        createdAt: payload.createdAt || new Date(),
        updatedAt: payload.updatedAt || new Date(),
      };
      documentStore.set(id, record);
      return clone(record);
    },
    async updateUploadDocumentStatus({ documentId, patch = {} }) {
      const record = documentStore.get(String(documentId));
      if (!record) {
        return null;
      }
      Object.assign(record, patch, { updatedAt: new Date() });
      return clone(record);
    },
    async findUploadDocumentById({ documentId, demoSessionId }) {
      const record = documentStore.get(String(documentId));
      if (!record || record.demoSessionId !== demoSessionId) {
        return null;
      }
      return clone(record);
    },
    _unsafeSnapshot() {
      return {
        documents: [...documentStore.values()].map(clone),
        folders: [...folderStore.values()].map(clone),
      };
    },
  };
}

export function isFolderAllowedForUpload(folder = {}, demoSessionId) {
  return (
    folder &&
    folder.demoSessionId === demoSessionId &&
    folder.scope === FOLDER_SCOPE.USER &&
    !folder.readOnly &&
    folder.lifecycleStatus === LIFECYCLE_STATUS.ACTIVE
  );
}
