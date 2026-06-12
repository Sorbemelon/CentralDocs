import { DOCUMENT_STATUS } from "../../constants/document.constants.js";
import { LIFECYCLE_STATUS } from "../../constants/lifecycle.constants.js";
import { CHAT_SESSION_ERROR_CODE } from "../../constants/chatSession.constants.js";
import { createHttpError } from "../../utils/httpError.js";
import { listAttachableDocumentsForChatSelection } from "../documents/document.service.js";
import { listAttachableFoldersForChatSelection } from "../folders/folder.service.js";
import { buildChatSnapshots } from "./chatSnapshot.service.js";

const defaultRepositories = Object.freeze({
  documentRepository: {
    listAttachableDocuments: listAttachableDocumentsForChatSelection,
  },
  folderRepository: {
    listAttachableFolders: listAttachableFoldersForChatSelection,
  },
});

function serializeId(value) {
  if (!value) {
    return null;
  }

  return String(value);
}

function publicDocumentIds(document = {}) {
  return [document.id, document.mockId, document._id].map((value) => serializeId(value)).filter(Boolean);
}

function publicFolderIds(folder = {}) {
  return [folder.id, folder.mockId, folder._id].map((value) => serializeId(value)).filter(Boolean);
}

export function normalizeSelectedIds(value, fieldName) {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw createHttpError(
      400,
      `${fieldName} must be an array of IDs.`,
      CHAT_SESSION_ERROR_CODE.CHAT_SELECTION_INVALID,
    );
  }

  return [...new Set(value.map((id) => String(id || "").trim()).filter(Boolean))];
}

function assertAttachableDocument(document = {}) {
  if (document.lifecycleStatus === LIFECYCLE_STATUS.TRASHED) {
    throw createHttpError(
      409,
      "Trashed documents cannot be attached to chat.",
      CHAT_SESSION_ERROR_CODE.DOCUMENT_TRASHED,
    );
  }
  if (document.status && document.status !== DOCUMENT_STATUS.READY) {
    throw createHttpError(
      409,
      "Only ready documents can be attached to chat.",
      CHAT_SESSION_ERROR_CODE.DOCUMENT_NOT_READY,
    );
  }
  if (document.lifecycleStatus && document.lifecycleStatus !== LIFECYCLE_STATUS.ACTIVE) {
    throw createHttpError(
      409,
      "Only active documents can be attached to chat.",
      CHAT_SESSION_ERROR_CODE.DOCUMENT_NOT_ATTACHABLE,
    );
  }
}

function assertAttachableFolder(folder = {}) {
  if (folder.lifecycleStatus === LIFECYCLE_STATUS.TRASHED) {
    throw createHttpError(
      409,
      "Trashed folders cannot be attached to chat.",
      CHAT_SESSION_ERROR_CODE.FOLDER_TRASHED,
    );
  }
  if (folder.lifecycleStatus && folder.lifecycleStatus !== LIFECYCLE_STATUS.ACTIVE) {
    throw createHttpError(
      409,
      "Only active folders can be attached to chat.",
      CHAT_SESSION_ERROR_CODE.FOLDER_NOT_ATTACHABLE,
    );
  }
}

function byAnyPublicId(entities = [], getIds) {
  const map = new Map();
  for (const entity of entities) {
    for (const id of getIds(entity)) {
      const existing = map.get(id);
      map.set(id, preferDocumentCandidate(entity, existing) ? entity : existing);
    }
  }

  return map;
}

function isDocumentSelected(document, selectedDocumentIds) {
  const ids = new Set(publicDocumentIds(document));
  return selectedDocumentIds.some((id) => ids.has(id));
}

function publicDocumentFolderId(document = {}) {
  return serializeId(document.folderMockId || document.publicFolderId || document.folderId);
}

function vectorDocumentId(document = {}) {
  return serializeId(document.vectorDocumentId || document._id || document.id);
}

function documentDedupeId(document = {}) {
  return serializeId(document.id || document.mockId || document._id);
}

function hasPersistentVectorId(document = {}) {
  const publicId = serializeId(document.id || document.mockId || document._id);
  const vectorId = vectorDocumentId(document);
  return Boolean(publicId && vectorId && publicId !== vectorId);
}

function preferDocumentCandidate(candidate = {}, existing = null) {
  if (!existing) {
    return true;
  }

  if (hasPersistentVectorId(candidate) && !hasPersistentVectorId(existing)) {
    return true;
  }

  const candidateChunkCount = candidate.contentStats?.chunkCount || 0;
  const existingChunkCount = existing.contentStats?.chunkCount || 0;
  return candidateChunkCount > existingChunkCount;
}

function resolvedFromFolderIds(document, selectedFolderIds) {
  const existing = (document.resolvedFromFolderIds || []).map((id) => serializeId(id)).filter(Boolean);
  const folderId = publicDocumentFolderId(document);
  const matched = [];

  for (const selectedFolderId of selectedFolderIds) {
    if (existing.includes(selectedFolderId) || folderId === selectedFolderId) {
      matched.push(selectedFolderId);
    }
  }

  return [...new Set([...existing, ...matched])];
}

function enrichDocument(document = {}, folderById = new Map(), selectedFolderIds = []) {
  const folderId = publicDocumentFolderId(document);
  const folder = folderById.get(folderId);

  return {
    ...document,
    id: serializeId(document.id || document.mockId || document._id),
    vectorDocumentId: vectorDocumentId(document),
    folderId,
    folderName: document.folderName || folder?.name || folder?.title || null,
    resolvedFromFolderIds: resolvedFromFolderIds(document, selectedFolderIds),
  };
}

function dedupeDocuments(documents = []) {
  const byId = new Map();
  const order = [];

  for (const document of documents) {
    const id = documentDedupeId(document);
    if (!id) {
      continue;
    }
    if (!byId.has(id)) {
      order.push(id);
      byId.set(id, document);
      continue;
    }

    const existing = byId.get(id);
    if (preferDocumentCandidate(document, existing)) {
      byId.set(id, document);
    }
  }

  return order.map((id) => byId.get(id));
}

export async function resolveChatSelection({
  demoSessionId,
  selectedDocumentIds = [],
  selectedFolderIds = [],
  repositories = {},
} = {}) {
  const normalizedDocumentIds = normalizeSelectedIds(selectedDocumentIds, "selectedDocumentIds");
  const normalizedFolderIds = normalizeSelectedIds(selectedFolderIds, "selectedFolderIds");
  const documentRepository =
    repositories.documentRepository || defaultRepositories.documentRepository;
  const folderRepository = repositories.folderRepository || defaultRepositories.folderRepository;

  const [documents, folders] = await Promise.all([
    documentRepository.listAttachableDocuments({
      demoSessionId,
      selectedDocumentIds: normalizedDocumentIds,
      selectedFolderIds: normalizedFolderIds,
    }),
    folderRepository.listAttachableFolders({
      demoSessionId,
      selectedFolderIds: normalizedFolderIds,
    }),
  ]);

  const documentById = byAnyPublicId(documents, publicDocumentIds);
  const folderById = byAnyPublicId(folders, publicFolderIds);

  for (const documentId of normalizedDocumentIds) {
    if (!documentById.has(documentId)) {
      throw createHttpError(
        404,
        "Selected document was not found.",
        CHAT_SESSION_ERROR_CODE.DOCUMENT_NOT_FOUND,
      );
    }
  }

  for (const folderId of normalizedFolderIds) {
    if (!folderById.has(folderId)) {
      throw createHttpError(
        404,
        "Selected folder was not found.",
        CHAT_SESSION_ERROR_CODE.FOLDER_NOT_FOUND,
      );
    }
  }

  const attachedFolders = normalizedFolderIds.map((folderId) => folderById.get(folderId));
  for (const folder of attachedFolders) {
    assertAttachableFolder(folder);
  }

  const enrichedDocuments = documents.map((document) =>
    enrichDocument(document, folderById, normalizedFolderIds),
  );
  const attachedDocuments = normalizedDocumentIds.map((documentId) =>
    enrichDocument(documentById.get(documentId), folderById, normalizedFolderIds),
  );
  for (const document of attachedDocuments) {
    assertAttachableDocument(document);
  }

  const resolvedDocuments = dedupeDocuments(
    enrichedDocuments.filter((document) => {
      return (
        isDocumentSelected(document, normalizedDocumentIds) ||
        resolvedFromFolderIds(document, normalizedFolderIds).length > 0
      );
    }),
  );
  for (const document of resolvedDocuments) {
    assertAttachableDocument(document);
  }

  return {
    selectedDocumentIds: normalizedDocumentIds,
    selectedFolderIds: normalizedFolderIds,
    attachedDocuments,
    attachedFolders,
    resolvedDocuments,
    snapshots: buildChatSnapshots({
      attachedDocuments,
      attachedFolders,
      resolvedDocuments,
    }),
  };
}
