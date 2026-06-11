import {
  DOCUMENT_SCOPE,
  DOCUMENT_STATUS,
} from "../../constants/document.constants.js";
import { LIFECYCLE_STATUS } from "../../constants/lifecycle.constants.js";
import {
  SEARCH_ERROR_CODE,
  SEARCH_SCOPE,
} from "../../constants/search.constants.js";
import { createHttpError } from "../../utils/httpError.js";
import { listSearchableDocumentsForSemanticSearch } from "../documents/document.service.js";

function serializeId(value) {
  if (!value) {
    return null;
  }

  return String(value);
}

function documentPublicId(document = {}) {
  return serializeId(document._id || document.id || document.mockId);
}

function documentChunkId(document = {}) {
  return serializeId(document._id || document.id);
}

function allowedDocumentScopes(scope) {
  if (scope === SEARCH_SCOPE.MOCK) {
    return [DOCUMENT_SCOPE.MOCK];
  }
  if (scope === SEARCH_SCOPE.USER) {
    return [DOCUMENT_SCOPE.USER];
  }
  if (scope === SEARCH_SCOPE.GENERATED) {
    return [DOCUMENT_SCOPE.GENERATED];
  }

  return [DOCUMENT_SCOPE.MOCK, DOCUMENT_SCOPE.USER, DOCUMENT_SCOPE.GENERATED];
}

function matchesSelectedDocument(document = {}, selectedDocumentIds = []) {
  if (selectedDocumentIds.length === 0) {
    return false;
  }

  const ids = new Set([
    serializeId(document._id),
    serializeId(document.id),
    serializeId(document.mockId),
  ].filter(Boolean));

  return selectedDocumentIds.some((selectedId) => ids.has(selectedId));
}

function matchesSelectedFolder(document = {}, selectedFolderIds = []) {
  if (selectedFolderIds.length === 0) {
    return false;
  }

  const ids = new Set([
    serializeId(document.folderMockId),
    serializeId(document.publicFolderId),
    serializeId(document.folderId),
  ].filter(Boolean));

  return selectedFolderIds.some((selectedId) => ids.has(selectedId));
}

function isSearchableDocument(document = {}, { allowedScopes, fileKinds = [] } = {}) {
  if (!allowedScopes.includes(document.scope)) {
    return false;
  }
  if (fileKinds.length > 0 && !fileKinds.includes(document.fileKind)) {
    return false;
  }
  if (document.lifecycleStatus !== LIFECYCLE_STATUS.ACTIVE) {
    return false;
  }
  if (document.status !== DOCUMENT_STATUS.READY) {
    return false;
  }

  return true;
}

function toDocumentMetadata(document = {}) {
  return {
    id: documentPublicId(document),
    vectorDocumentId: documentChunkId(document),
    mockId: document.mockId || null,
    folderId: serializeId(document.folderMockId || document.publicFolderId || document.folderId),
    folderName: document.folderName || document.folder?.name || null,
    title: document.title || null,
    fileKind: document.fileKind || null,
    fileType: document.fileKind || document.fileExtension || null,
    scope: document.scope || null,
    sourceType: document.sourceType || null,
    status: document.status || null,
    lifecycleStatus: document.lifecycleStatus || null,
    demoSessionId: document.demoSessionId || null,
  };
}

function filterSearchableDocuments(documents = [], request = {}) {
  const allowedScopes = allowedDocumentScopes(request.scope);
  const hasSelection =
    request.selectedDocumentIds.length > 0 || request.selectedFolderIds.length > 0;

  return documents.filter((document) => {
    if (!isSearchableDocument(document, { allowedScopes, fileKinds: request.fileKinds })) {
      return false;
    }

    if (!hasSelection) {
      return true;
    }

    return (
      matchesSelectedDocument(document, request.selectedDocumentIds) ||
      matchesSelectedFolder(document, request.selectedFolderIds)
    );
  });
}

function dedupeDocuments(documents = []) {
  const seen = new Set();
  const deduped = [];

  for (const document of documents) {
    const key = documentChunkId(document) || documentPublicId(document);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(document);
  }

  return deduped;
}

export async function resolveSearchScope({
  request,
  demoSessionId = null,
  repositories = {},
} = {}) {
  const documentRepository = repositories.documentRepository || {
    listSearchableDocuments: listSearchableDocumentsForSemanticSearch,
  };
  const allowedScopes = allowedDocumentScopes(request.scope);
  const documents = await documentRepository.listSearchableDocuments({
    demoSessionId,
    scopes: allowedScopes,
    selectedDocumentIds: request.selectedDocumentIds,
    selectedFolderIds: request.selectedFolderIds,
    fileKinds: request.fileKinds,
  });

  const searchableDocuments = dedupeDocuments(filterSearchableDocuments(documents, request));
  const documentMetadata = searchableDocuments.map((document) => toDocumentMetadata(document));
  const resolvedDocumentIds = documentMetadata
    .map((document) => document.vectorDocumentId)
    .filter(Boolean);

  return {
    scope: request.scope,
    selectedDocumentIds: request.selectedDocumentIds,
    selectedFolderIds: request.selectedFolderIds,
    resolvedDocumentIds,
    allowedScopes,
    demoSessionId,
    documents: documentMetadata,
    documentsById: new Map(
      documentMetadata.flatMap((document) => [
        [document.id, document],
        [document.vectorDocumentId, document],
      ]).filter(([key]) => Boolean(key)),
    ),
    searchedDocumentCount: resolvedDocumentIds.length,
  };
}

export function assertNonEmptySearchScope(scopeResult = {}, request = {}) {
  if ((scopeResult.resolvedDocumentIds || []).length > 0) {
    return scopeResult;
  }

  const hasSelection =
    (request.selectedDocumentIds || []).length > 0 ||
    (request.selectedFolderIds || []).length > 0;

  if (hasSelection) {
    throw createHttpError(
      404,
      "No searchable documents matched the selected search scope.",
      SEARCH_ERROR_CODE.SEARCH_SCOPE_EMPTY,
    );
  }

  return scopeResult;
}
