import mongoose from "mongoose";
import { nanoid } from "nanoid";
import {
  DOCUMENT_SCOPE,
  DOCUMENT_SCOPES,
  DOCUMENT_STATUS,
  DOCUMENT_STATUSES,
  FILE_KINDS,
  SOURCE_TYPE,
  SOURCE_TYPES,
} from "../../constants/document.constants.js";
import { LIFECYCLE_STATUS, LIFECYCLE_STATUSES } from "../../constants/lifecycle.constants.js";
import { getMongoStatus, isMongoConnected } from "../../db/connectMongo.js";
import { Document } from "../../models/Document.model.js";
import { Folder } from "../../models/Folder.model.js";
import { isMockDocumentId, isMockFolderId } from "../../utils/ids.js";
import { createHttpError } from "../../utils/httpError.js";
import {
  activeOnlyFilter,
  buildRestorePatch,
  buildSoftDeletePatch,
  isTrashedLifecycle,
} from "../lifecycle/softDelete.service.js";
import {
  findMockDocumentById,
  findMockFolderById,
  getMockDocumentPreview,
  listMockDocuments,
} from "../demo/demoWorkspace.service.js";
import { toDocumentDto, toDocumentDtos } from "./document.dto.js";

function includeTrash(query = {}) {
  return query.includeTrash === "true";
}

function validateEnum(value, allowed, message) {
  if (!value) {
    return null;
  }

  if (!allowed.includes(value)) {
    throw createHttpError(400, message, "INVALID_REQUEST");
  }

  return value;
}

function requirePersistence() {
  if (!isMongoConnected()) {
    throw createHttpError(
      503,
      "MongoDB persistence is not configured or connected for this operation.",
      "PERSISTENCE_NOT_CONFIGURED",
    );
  }
}

function assertValidObjectId(id, code = "DOCUMENT_NOT_FOUND") {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createHttpError(404, "Document was not found.", code);
  }
}

async function rejectMockDocument(documentId, { restore = false } = {}) {
  if ((await findMockDocumentById(documentId)) || isMockDocumentId(documentId)) {
    throw createHttpError(
      restore ? 400 : 403,
      restore
        ? "Read-only mock documents do not require restore."
        : "Mock documents are read-only and cannot be changed.",
      restore ? "INVALID_REQUEST" : "READ_ONLY_RESOURCE",
    );
  }
}

function normalizeFilters(query = {}) {
  return {
    folderId: query.folderId || null,
    scope: validateEnum(query.scope, DOCUMENT_SCOPES, "Unsupported document scope filter."),
    sourceType: validateEnum(query.sourceType, SOURCE_TYPES, "Unsupported source type filter."),
    fileKind: validateEnum(query.fileKind, FILE_KINDS, "Unsupported file kind filter."),
    status: validateEnum(query.status, DOCUMENT_STATUSES, "Unsupported document status filter."),
    lifecycleStatus: validateEnum(
      query.lifecycleStatus,
      LIFECYCLE_STATUSES,
      "Unsupported lifecycle status filter.",
    ),
    includeTrash: query.includeTrash,
    q: query.q || null,
  };
}

function buildDocumentFilter(query = {}, demoSessionId = null) {
  const filters = normalizeFilters(query);
  const filter = {};

  if (demoSessionId) {
    filter.demoSessionId = demoSessionId;
  }
  if (filters.folderId) {
    filter.folderId = filters.folderId;
  }
  if (filters.scope) {
    filter.scope = filters.scope;
  }
  if (filters.sourceType) {
    filter.sourceType = filters.sourceType;
  }
  if (filters.fileKind) {
    filter.fileKind = filters.fileKind;
  }
  if (filters.status) {
    filter.status = filters.status;
  }
  if (filters.lifecycleStatus) {
    filter.lifecycleStatus = filters.lifecycleStatus;
  } else if (!includeTrash(query)) {
    Object.assign(filter, activeOnlyFilter());
  }
  if (filters.q) {
    filter.title = new RegExp(filters.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }

  return filter;
}

export function getDocumentPersistenceStatus() {
  return getMongoStatus();
}

export async function listDocuments({ query = {}, demoSessionId = null } = {}) {
  const filters = normalizeFilters(query);
  const documents = [];

  if (!filters.scope || filters.scope === DOCUMENT_SCOPE.MOCK) {
    documents.push(...toDocumentDtos(await listMockDocuments(filters)));
  }

  if (isMongoConnected() && (!filters.scope || filters.scope !== DOCUMENT_SCOPE.MOCK)) {
    const dbDocuments = await Document.find(buildDocumentFilter(query, demoSessionId))
      .sort({ createdAt: -1 })
      .lean();
    documents.push(...toDocumentDtos(dbDocuments));
  }

  return {
    documents,
    counts: {
      documents: documents.length,
    },
    persistenceStatus: getDocumentPersistenceStatus(),
  };
}

export async function getDocumentById({ documentId, query = {}, demoSessionId = null } = {}) {
  const mockDocument = await findMockDocumentById(documentId);
  if (mockDocument) {
    if (!includeTrash(query) && mockDocument.lifecycleStatus !== LIFECYCLE_STATUS.ACTIVE) {
      throw createHttpError(404, "Document was not found.", "DOCUMENT_NOT_FOUND");
    }

    return toDocumentDto(mockDocument, { includePreview: true });
  }

  if (isMockDocumentId(documentId)) {
    throw createHttpError(404, "Document was not found.", "DOCUMENT_NOT_FOUND");
  }

  requirePersistence();
  assertValidObjectId(documentId);

  const filter = { _id: documentId };
  if (demoSessionId) {
    filter.demoSessionId = demoSessionId;
  }
  if (!includeTrash(query)) {
    Object.assign(filter, activeOnlyFilter());
  }

  const document = await Document.findOne(filter).lean();
  if (!document) {
    throw createHttpError(404, "Document was not found.", "DOCUMENT_NOT_FOUND");
  }

  return toDocumentDto(document, { includePreview: true });
}

export async function getDocumentPreviewById({ documentId, demoSessionId = null } = {}) {
  const mockPreview = await getMockDocumentPreview(documentId);
  if (mockPreview) {
    return mockPreview;
  }

  if (isMockDocumentId(documentId)) {
    throw createHttpError(404, "Document was not found.", "DOCUMENT_NOT_FOUND");
  }

  requirePersistence();
  assertValidObjectId(documentId);

  const document = await Document.findOne({
    _id: documentId,
    demoSessionId,
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
  }).lean();

  if (!document) {
    throw createHttpError(404, "Document was not found.", "DOCUMENT_NOT_FOUND");
  }

  return {
    id: String(document._id),
    title: document.title,
    fileKind: document.fileKind,
    folderName: null,
    extractedTextPreview: document.extractedTextPreview || null,
    previewUnavailable: !document.extractedTextPreview,
    reason: document.extractedTextPreview ? null : "preview_not_available",
  };
}

export async function moveDocument({ documentId, demoSessionId, folderId } = {}) {
  await rejectMockDocument(documentId);

  if (folderId && ((await findMockFolderById(folderId)) || isMockFolderId(folderId))) {
    throw createHttpError(
      400,
      "Documents cannot be moved into read-only mock folders.",
      "INVALID_DOCUMENT_MOVE",
    );
  }

  requirePersistence();
  assertValidObjectId(documentId);

  const document = await Document.findOne({ _id: documentId, demoSessionId });
  if (!document) {
    throw createHttpError(404, "Document was not found.", "DOCUMENT_NOT_FOUND");
  }
  if (document.readOnly) {
    throw createHttpError(403, "Read-only documents cannot be moved.", "READ_ONLY_RESOURCE");
  }
  if (isTrashedLifecycle(document)) {
    throw createHttpError(400, "Trashed documents cannot be moved.", "INVALID_REQUEST");
  }

  if (folderId) {
    assertValidObjectId(folderId, "FOLDER_NOT_FOUND");
    const folder = await Folder.findOne({
      _id: folderId,
      demoSessionId,
      lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
    }).lean();
    if (!folder || folder.readOnly) {
      throw createHttpError(400, "Target folder is not valid.", "INVALID_DOCUMENT_MOVE");
    }
  }

  document.folderId = folderId || null;
  await document.save();

  return toDocumentDto(document);
}

export async function softDeleteDocument({ documentId, demoSessionId } = {}) {
  await rejectMockDocument(documentId);
  requirePersistence();
  assertValidObjectId(documentId);

  const document = await Document.findOne({ _id: documentId, demoSessionId });
  if (!document) {
    throw createHttpError(404, "Document was not found.", "DOCUMENT_NOT_FOUND");
  }
  if (document.readOnly) {
    throw createHttpError(403, "Read-only documents cannot be deleted.", "READ_ONLY_RESOURCE");
  }

  Object.assign(
    document,
    buildSoftDeletePatch({
      demoSessionId,
      deleteOperationId: `document_delete_${nanoid(12)}`,
      originalFolderIdBeforeDelete: document.folderId,
    }),
  );
  await document.save();

  return toDocumentDto(document);
}

export async function restoreDocument({ documentId, demoSessionId } = {}) {
  await rejectMockDocument(documentId, { restore: true });
  requirePersistence();
  assertValidObjectId(documentId);

  const document = await Document.findOne({ _id: documentId, demoSessionId });
  if (!document) {
    throw createHttpError(404, "Document was not found.", "DOCUMENT_NOT_FOUND");
  }

  Object.assign(document, buildRestorePatch({ restoreFolderId: null }));
  await document.save();

  return toDocumentDto(document);
}

export async function listTrashedDocuments({ demoSessionId = null } = {}) {
  if (!isMongoConnected()) {
    return [];
  }

  const filter = {
    lifecycleStatus: LIFECYCLE_STATUS.TRASHED,
    scope: { $ne: DOCUMENT_SCOPE.MOCK },
  };

  if (demoSessionId) {
    filter.demoSessionId = demoSessionId;
  }

  return toDocumentDtos(await Document.find(filter).sort({ deletedAt: -1 }).lean());
}

export async function listSearchableDocumentsForSemanticSearch({
  demoSessionId = null,
  scopes = [],
  selectedDocumentIds = [],
  selectedFolderIds = [],
  fileKinds = [],
} = {}) {
  if (!isMongoConnected()) {
    return [];
  }

  const requestedScopes = scopes.length > 0 ? scopes : DOCUMENT_SCOPES;
  const scopeFilters = [];

  if (requestedScopes.includes(DOCUMENT_SCOPE.MOCK)) {
    scopeFilters.push({
      scope: DOCUMENT_SCOPE.MOCK,
      demoSessionId: null,
    });
  }
  const sessionOwnedScopes = requestedScopes.filter((scope) => scope !== DOCUMENT_SCOPE.MOCK);
  if (sessionOwnedScopes.length > 0 && demoSessionId) {
    scopeFilters.push({
      scope: { $in: sessionOwnedScopes },
      demoSessionId,
    });
  }

  if (scopeFilters.length === 0) {
    return [];
  }

  const filter = {
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
    status: DOCUMENT_STATUS.READY,
    $or: scopeFilters,
  };

  const selectionFilters = [];
  const objectIds = selectedDocumentIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (objectIds.length > 0) {
    selectionFilters.push({ _id: { $in: objectIds } });
  }
  if (selectedDocumentIds.length > 0) {
    selectionFilters.push({ mockId: { $in: selectedDocumentIds } });
  }
  if (selectedFolderIds.length > 0) {
    const folderObjectIds = selectedFolderIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const folderIds = [...folderObjectIds];
    const folderMockIds = selectedFolderIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (folderMockIds.length > 0) {
      selectionFilters.push({ folderMockId: { $in: folderMockIds } });
    }
    if (folderMockIds.length > 0) {
      const mockFolders = await Folder.find({
        mockId: { $in: folderMockIds },
        lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
      }).select({ _id: 1 }).lean();
      folderIds.push(...mockFolders.map((folder) => String(folder._id)));
    }
    if (folderIds.length > 0) {
      selectionFilters.push({ folderId: { $in: folderIds } });
    }
  }
  if (selectionFilters.length > 0) {
    filter.$and = [{ $or: selectionFilters }];
  }
  if (fileKinds.length > 0) {
    filter.fileKind = { $in: fileKinds };
  }

  return Document.find(filter).lean();
}

export async function listAttachableDocumentsForChatSelection({
  demoSessionId = null,
  selectedDocumentIds = [],
  selectedFolderIds = [],
} = {}) {
  const mockDocuments = (await listMockDocuments({})).filter((document) => {
    return (
      selectedDocumentIds.includes(document.id) ||
      selectedDocumentIds.includes(document.mockId) ||
      selectedFolderIds.includes(document.folderId)
    );
  });

  if (!isMongoConnected()) {
    return mockDocuments;
  }

  const selectionFilters = [];
  const objectIds = selectedDocumentIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (objectIds.length > 0) {
    selectionFilters.push({ _id: { $in: objectIds } });
  }
  if (selectedDocumentIds.length > 0) {
    selectionFilters.push({ mockId: { $in: selectedDocumentIds } });
  }

  const folderIds = selectedFolderIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  const folderMockIds = selectedFolderIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
  if (folderMockIds.length > 0) {
    selectionFilters.push({ folderMockId: { $in: folderMockIds } });
  }
  if (folderMockIds.length > 0) {
    const mockFolders = await Folder.find({
      mockId: { $in: folderMockIds },
      lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
    }).select({ _id: 1 }).lean();
    folderIds.push(...mockFolders.map((folder) => String(folder._id)));
  }
  if (folderIds.length > 0) {
    selectionFilters.push({ folderId: { $in: folderIds } });
  }

  if (selectionFilters.length === 0) {
    return mockDocuments;
  }

  const dbDocuments = await Document.find({
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
    status: DOCUMENT_STATUS.READY,
    $and: [{ $or: selectionFilters }],
    $or: [
      { scope: DOCUMENT_SCOPE.MOCK, demoSessionId: null },
      { scope: { $in: [DOCUMENT_SCOPE.USER, DOCUMENT_SCOPE.GENERATED] }, demoSessionId },
    ],
  }).lean();

  return [...mockDocuments, ...dbDocuments];
}
