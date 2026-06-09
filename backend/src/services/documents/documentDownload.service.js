import mongoose from "mongoose";
import { DOCUMENT_SCOPE, STORAGE_PROVIDER } from "../../constants/document.constants.js";
import { LIFECYCLE_STATUS } from "../../constants/lifecycle.constants.js";
import { isMongoConnected } from "../../db/connectMongo.js";
import { Document } from "../../models/Document.model.js";
import { isMockDocumentId } from "../../utils/ids.js";
import { createHttpError } from "../../utils/httpError.js";
import { findMockDocumentById } from "../demo/demoWorkspace.service.js";
import { findSeededMockDocumentByMockId } from "../mockData/mockSeed.repository.js";
import { getPresignedDownloadUrl } from "../storage/s3Storage.service.js";

let testOverrides = {};

function getDependencies(overrides = {}) {
  return {
    findMockDocumentById:
      overrides.findMockDocumentById ??
      testOverrides.findMockDocumentById ??
      findMockDocumentById,
    isMongoConnected:
      overrides.isMongoConnected ?? testOverrides.isMongoConnected ?? isMongoConnected,
    findPersistentDocumentById:
      overrides.findPersistentDocumentById ??
      testOverrides.findPersistentDocumentById ??
      findPersistentDocumentById,
    createPresignedDownloadUrl:
      overrides.createPresignedDownloadUrl ??
      testOverrides.createPresignedDownloadUrl ??
      getPresignedDownloadUrl,
    findSeededMockDocumentByMockId:
      overrides.findSeededMockDocumentByMockId ??
      testOverrides.findSeededMockDocumentByMockId ??
      findSeededMockDocumentByMockId,
  };
}

function createDownloadUnavailableError(reason) {
  return createHttpError(409, reason, "DOWNLOAD_NOT_AVAILABLE", { reason });
}

function createDocumentTrashedError() {
  return createHttpError(
    409,
    "Document is in Trash and cannot be downloaded.",
    "DOCUMENT_TRASHED",
  );
}

function requirePersistence(isConnected) {
  if (!isConnected()) {
    throw createHttpError(
      503,
      "MongoDB persistence is required to resolve this document download.",
      "PERSISTENCE_NOT_CONFIGURED",
    );
  }
}

function getDocumentFilename(document, requestedFilename) {
  return (
    requestedFilename ||
    document.downloadFilename ||
    document.originalFilename ||
    `${document.title || "document"}.${document.fileExtension || "txt"}`
  );
}

function assertActiveForDownload(document) {
  if (document.lifecycleStatus === LIFECYCLE_STATUS.TRASHED) {
    throw createDocumentTrashedError();
  }
}

function assertDownloadableObject(document, unavailableReason) {
  if (document.storageProvider && document.storageProvider !== STORAGE_PROVIDER.S3) {
    throw createDownloadUnavailableError("Document is not stored in S3.");
  }
  if (!document.objectKey && !document.storageObjectKey) {
    throw createDownloadUnavailableError(unavailableReason);
  }
}

async function findPersistentDocumentById({ documentId, demoSessionId }) {
  const filter = {
    _id: documentId,
    demoSessionId,
  };

  return Document.findOne(filter).lean();
}

async function createUrlPayload(document, requestedFilename, dependencies) {
  const objectKey = document.objectKey || document.storageObjectKey;
  const filename = getDocumentFilename(document, requestedFilename);
  const signed = await dependencies.createPresignedDownloadUrl({
    objectKey,
    downloadFilename: filename,
    contentType: document.mimeType,
  });

  return {
    documentId: document.id || String(document._id),
    filename: signed.filename,
    expiresInSeconds: signed.expiresInSeconds,
    downloadUrl: signed.downloadUrl,
    storageProvider: signed.storageProvider,
  };
}

export async function createDocumentDownloadUrl(
  { documentId, demoSessionId = null, requestedFilename = null } = {},
  overrides = {},
) {
  const dependencies = getDependencies(overrides);
  const seededMockDocument = await dependencies.findSeededMockDocumentByMockId(documentId);
  if (seededMockDocument) {
    assertActiveForDownload(seededMockDocument);
    assertDownloadableObject(seededMockDocument, "Seeded mock document is not linked to S3.");
    return createUrlPayload(
      {
        ...seededMockDocument,
        id: seededMockDocument.mockId || seededMockDocument.id || seededMockDocument._id,
      },
      requestedFilename,
      dependencies,
    );
  }

  const mockDocument = await dependencies.findMockDocumentById(documentId);

  if (mockDocument) {
    assertActiveForDownload(mockDocument);
    if (mockDocument.seeded === false) {
      throw createDownloadUnavailableError("Mock document is not linked to S3 yet.");
    }
    assertDownloadableObject(mockDocument, "Mock document is not linked to S3 yet.");
    return createUrlPayload(mockDocument, requestedFilename, dependencies);
  }

  if (isMockDocumentId(documentId)) {
    throw createHttpError(404, "Document was not found.", "DOCUMENT_NOT_FOUND");
  }

  requirePersistence(dependencies.isMongoConnected);

  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    throw createHttpError(404, "Document was not found.", "DOCUMENT_NOT_FOUND");
  }

  const document = await dependencies.findPersistentDocumentById({ documentId, demoSessionId });
  if (!document || document.scope === DOCUMENT_SCOPE.MOCK) {
    throw createHttpError(404, "Document was not found.", "DOCUMENT_NOT_FOUND");
  }

  assertActiveForDownload(document);
  assertDownloadableObject(document, "Document does not have a downloadable S3 object.");

  return createUrlPayload(document, requestedFilename, dependencies);
}

export function setDocumentDownloadDependenciesForTests(overrides = {}) {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Document download dependency overrides are only available in tests.");
  }

  testOverrides = { ...testOverrides, ...overrides };
}

export function resetDocumentDownloadDependenciesForTests() {
  testOverrides = {};
}
