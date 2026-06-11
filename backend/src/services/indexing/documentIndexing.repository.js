import mongoose from "mongoose";
import { DOCUMENT_SCOPE } from "../../constants/document.constants.js";
import { LIFECYCLE_STATUS } from "../../constants/lifecycle.constants.js";
import { isMongoConnected } from "../../db/connectMongo.js";
import { Document } from "../../models/Document.model.js";
import { createHttpError } from "../../utils/httpError.js";

function requirePersistence() {
  if (!isMongoConnected()) {
    throw createHttpError(
      503,
      "MongoDB persistence is not configured for document indexing.",
      "PERSISTENCE_NOT_CONFIGURED",
    );
  }
}

function assertObjectId(documentId) {
  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    throw createHttpError(404, "Document was not found.", "DOCUMENT_NOT_FOUND");
  }
}

export function isDocumentIndexingPersistenceAvailable() {
  return isMongoConnected();
}

export async function findDocumentForIndexing({
  documentId,
  scope = null,
  demoSessionId = null,
  includeTrash = false,
} = {}) {
  requirePersistence();
  assertObjectId(documentId);

  const filter = { _id: documentId };
  if (scope) {
    filter.scope = scope;
  }
  if (demoSessionId) {
    filter.demoSessionId = demoSessionId;
  }
  if (!includeTrash) {
    filter.lifecycleStatus = LIFECYCLE_STATUS.ACTIVE;
  }

  return Document.findOne(filter).lean();
}

export async function findPersistentMockDocumentByMockId(mockId) {
  requirePersistence();
  return Document.findOne({
    mockId,
    scope: DOCUMENT_SCOPE.MOCK,
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
  }).lean();
}

export async function updateDocumentIndexingStatus({ documentId, patch = {} } = {}) {
  requirePersistence();
  assertObjectId(documentId);
  return Document.findByIdAndUpdate(
    documentId,
    { $set: patch },
    { returnDocument: "after", lean: true },
  );
}

export async function updateDocumentMediaMeta({ documentId, mediaMeta = {} } = {}) {
  requirePersistence();
  assertObjectId(documentId);
  return Document.findByIdAndUpdate(
    documentId,
    { $set: { mediaMeta } },
    { returnDocument: "after", lean: true },
  );
}
