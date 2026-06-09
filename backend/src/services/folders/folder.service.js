import mongoose from "mongoose";
import { nanoid } from "nanoid";
import { DEMO_LIMITS } from "../../config/limits.js";
import { FOLDER_SCOPE, FOLDER_SCOPES } from "../../constants/document.constants.js";
import { LIFECYCLE_STATUS, LIFECYCLE_STATUSES } from "../../constants/lifecycle.constants.js";
import { getMongoStatus, isMongoConnected } from "../../db/connectMongo.js";
import { Document } from "../../models/Document.model.js";
import { Folder } from "../../models/Folder.model.js";
import {
  activeOnlyFilter,
  buildRestorePatch,
  buildSoftDeletePatch,
  isTrashedLifecycle,
} from "../lifecycle/softDelete.service.js";
import {
  findMockFolderById,
  listMockDocumentsForFolder,
  listMockFolders,
} from "../demo/demoWorkspace.service.js";
import { isMockFolderId } from "../../utils/ids.js";
import { createHttpError } from "../../utils/httpError.js";
import { toDocumentDtos } from "../documents/document.dto.js";
import { toFolderDto, toFolderDtos } from "./folder.dto.js";

const MAX_FOLDER_NAME_LENGTH = 120;

function includeTrash(query = {}) {
  return query.includeTrash === "true";
}

function validateFolderName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed || trimmed.length > MAX_FOLDER_NAME_LENGTH) {
    throw createHttpError(
      400,
      `Folder name must be between 1 and ${MAX_FOLDER_NAME_LENGTH} characters.`,
      "INVALID_FOLDER_NAME",
    );
  }

  return trimmed;
}

function validateScope(scope) {
  if (!scope) {
    return null;
  }

  if (!FOLDER_SCOPES.includes(scope)) {
    throw createHttpError(400, "Unsupported folder scope filter.", "INVALID_REQUEST");
  }

  return scope;
}

function validateLifecycleStatus(lifecycleStatus) {
  if (!lifecycleStatus) {
    return null;
  }

  if (!LIFECYCLE_STATUSES.includes(lifecycleStatus)) {
    throw createHttpError(400, "Unsupported lifecycle status filter.", "INVALID_REQUEST");
  }

  return lifecycleStatus;
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

function assertValidObjectId(id, notFoundCode = "FOLDER_NOT_FOUND") {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createHttpError(404, "Folder was not found.", notFoundCode);
  }
}

async function rejectMockFolder(folderId, { restore = false } = {}) {
  if ((await findMockFolderById(folderId)) || isMockFolderId(folderId)) {
    throw createHttpError(
      restore ? 400 : 403,
      restore
        ? "Read-only mock folders do not require restore."
        : "Mock folders are read-only and cannot be changed.",
      restore ? "INVALID_REQUEST" : "READ_ONLY_RESOURCE",
    );
  }
}

function buildFolderFilter(query = {}, demoSessionId = null) {
  const scope = validateScope(query.scope);
  const lifecycleStatus = validateLifecycleStatus(query.lifecycleStatus);
  const filter = {};

  if (demoSessionId) {
    filter.demoSessionId = demoSessionId;
  }
  if (scope) {
    filter.scope = scope;
  }
  if (query.parentFolderId) {
    filter.parentFolderId = query.parentFolderId;
  }
  if (lifecycleStatus) {
    filter.lifecycleStatus = lifecycleStatus;
  } else if (!includeTrash(query)) {
    Object.assign(filter, activeOnlyFilter());
  }

  return filter;
}

export function getPersistenceStatus() {
  return getMongoStatus();
}

export async function listFolders({ query = {}, demoSessionId = null } = {}) {
  const scope = validateScope(query.scope);
  validateLifecycleStatus(query.lifecycleStatus);
  const folders = [];

  if (!scope || scope === FOLDER_SCOPE.MOCK) {
    folders.push(...toFolderDtos(await listMockFolders(query)));
  }

  if (isMongoConnected() && (!scope || scope === FOLDER_SCOPE.USER)) {
    const dbFolders = await Folder.find(buildFolderFilter(query, demoSessionId))
      .sort({ createdAt: 1 })
      .lean();
    folders.push(...toFolderDtos(dbFolders));
  }

  return {
    folders,
    counts: {
      folders: folders.length,
    },
    persistenceStatus: getPersistenceStatus(),
  };
}

export async function createFolder({ demoSessionId, name, parentFolderId = null } = {}) {
  const folderName = validateFolderName(name);
  requirePersistence();

  if (!demoSessionId) {
    throw createHttpError(400, "An active demo session is required.", "INVALID_REQUEST");
  }

  const userFolderCount = await Folder.countDocuments({
    demoSessionId,
    scope: FOLDER_SCOPE.USER,
  });

  if (userFolderCount >= DEMO_LIMITS.maxUserFolders) {
    throw createHttpError(
      409,
      "The demo user folder limit has been reached.",
      "DEMO_LIMIT_REACHED",
    );
  }

  const created = await Folder.create({
    demoSessionId,
    scope: FOLDER_SCOPE.USER,
    name: folderName,
    parentFolderId,
    path: `/${folderName}`,
    readOnly: false,
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
  });

  return toFolderDto(created);
}

export async function renameFolder({ folderId, demoSessionId, name } = {}) {
  await rejectMockFolder(folderId);
  const folderName = validateFolderName(name);
  requirePersistence();
  assertValidObjectId(folderId);

  const folder = await Folder.findOne({ _id: folderId, demoSessionId });
  if (!folder) {
    throw createHttpError(404, "Folder was not found.", "FOLDER_NOT_FOUND");
  }
  if (folder.readOnly) {
    throw createHttpError(403, "Read-only folders cannot be changed.", "READ_ONLY_RESOURCE");
  }
  if (isTrashedLifecycle(folder)) {
    throw createHttpError(400, "Trashed folders cannot be renamed.", "INVALID_REQUEST");
  }

  folder.name = folderName;
  folder.path = `/${folderName}`;
  await folder.save();

  return toFolderDto(folder);
}

export async function softDeleteFolder({ folderId, demoSessionId } = {}) {
  await rejectMockFolder(folderId);
  requirePersistence();
  assertValidObjectId(folderId);

  const folder = await Folder.findOne({ _id: folderId, demoSessionId });
  if (!folder) {
    throw createHttpError(404, "Folder was not found.", "FOLDER_NOT_FOUND");
  }
  if (folder.readOnly) {
    throw createHttpError(403, "Read-only folders cannot be deleted.", "READ_ONLY_RESOURCE");
  }

  const deleteOperationId = `folder_delete_${nanoid(12)}`;
  const patch = buildSoftDeletePatch({ demoSessionId, deleteOperationId });
  Object.assign(folder, patch);
  await folder.save();

  await Folder.updateMany(
    { demoSessionId, parentFolderId: folder._id, readOnly: false },
    { $set: patch },
  );
  await Document.updateMany(
    { demoSessionId, folderId: folder._id, readOnly: false },
    { $set: patch },
  );

  return toFolderDto(folder);
}

export async function restoreFolder({ folderId, demoSessionId } = {}) {
  await rejectMockFolder(folderId, { restore: true });
  requirePersistence();
  assertValidObjectId(folderId);

  const folder = await Folder.findOne({ _id: folderId, demoSessionId });
  if (!folder) {
    throw createHttpError(404, "Folder was not found.", "FOLDER_NOT_FOUND");
  }

  Object.assign(folder, buildRestorePatch({ restoreFolderId: null }));
  await folder.save();

  return toFolderDto(folder);
}

export async function listFolderDocuments({ folderId, query = {}, demoSessionId = null } = {}) {
  const mockDocuments = await listMockDocumentsForFolder(folderId, query);
  if (mockDocuments) {
    const documents = toDocumentDtos(mockDocuments);
    return {
      folder: toFolderDto(await findMockFolderById(folderId)),
      documents,
      counts: {
        documents: documents.length,
      },
      persistenceStatus: getPersistenceStatus(),
    };
  }

  if (isMockFolderId(folderId)) {
    throw createHttpError(404, "Folder was not found.", "FOLDER_NOT_FOUND");
  }

  requirePersistence();
  assertValidObjectId(folderId);

  const folder = await Folder.findOne({ _id: folderId, demoSessionId }).lean();
  if (!folder) {
    throw createHttpError(404, "Folder was not found.", "FOLDER_NOT_FOUND");
  }

  const documentFilter = { demoSessionId, folderId };
  if (!includeTrash(query)) {
    Object.assign(documentFilter, activeOnlyFilter());
  }

  const documents = toDocumentDtos(await Document.find(documentFilter).sort({ createdAt: -1 }).lean());

  return {
    folder: toFolderDto(folder),
    documents,
    counts: {
      documents: documents.length,
    },
    persistenceStatus: getPersistenceStatus(),
  };
}

export async function listTrashedFolders({ demoSessionId = null } = {}) {
  if (!isMongoConnected()) {
    return [];
  }

  const filter = {
    lifecycleStatus: LIFECYCLE_STATUS.TRASHED,
    scope: FOLDER_SCOPE.USER,
  };

  if (demoSessionId) {
    filter.demoSessionId = demoSessionId;
  }

  return toFolderDtos(await Folder.find(filter).sort({ deletedAt: -1 }).lean());
}

export async function listAttachableFoldersForChatSelection({
  demoSessionId = null,
  selectedFolderIds = [],
} = {}) {
  const mockFolders = (await listMockFolders({})).filter((folder) =>
    selectedFolderIds.includes(folder.id) || selectedFolderIds.includes(folder.mockId),
  );

  if (!isMongoConnected() || selectedFolderIds.length === 0) {
    return mockFolders;
  }

  const objectIds = selectedFolderIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  const filter = {
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
    $or: [
      { scope: FOLDER_SCOPE.MOCK, mockId: { $in: selectedFolderIds } },
      { scope: FOLDER_SCOPE.USER, demoSessionId, _id: { $in: objectIds } },
    ],
  };

  const dbFolders = await Folder.find(filter).lean();
  return [...mockFolders, ...dbFolders];
}
