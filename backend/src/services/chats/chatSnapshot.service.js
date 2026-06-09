function serializeId(value) {
  if (!value) {
    return null;
  }

  return String(value);
}

function publicDocumentId(document = {}) {
  return serializeId(document.id || document.mockId || document._id);
}

function publicFolderId(folder = {}) {
  return serializeId(folder.id || folder.mockId || folder._id);
}

export function toAttachedDocumentSnapshot(document = {}) {
  return {
    id: publicDocumentId(document),
    title: document.title || null,
    fileKind: document.fileKind || null,
    sourceType: document.sourceType || null,
    scope: document.scope || null,
    folderId: serializeId(document.folderId),
    folderName: document.folderName || null,
    status: document.status || null,
    lifecycleStatus: document.lifecycleStatus || null,
  };
}

export function toAttachedFolderSnapshot(folder = {}) {
  return {
    id: publicFolderId(folder),
    name: folder.name || folder.title || null,
    scope: folder.scope || null,
    path: folder.path || null,
    readOnly: Boolean(folder.readOnly),
    lifecycleStatus: folder.lifecycleStatus || null,
  };
}

export function toResolvedDocumentSnapshot(document = {}) {
  return {
    ...toAttachedDocumentSnapshot(document),
    resolvedFromFolderIds: (document.resolvedFromFolderIds || [])
      .map((folderId) => serializeId(folderId))
      .filter(Boolean),
  };
}

export function buildChatSnapshots({
  attachedDocuments = [],
  attachedFolders = [],
  resolvedDocuments = [],
} = {}) {
  return {
    attachedDocumentSnapshot: attachedDocuments.map((document) =>
      toAttachedDocumentSnapshot(document),
    ),
    attachedFolderSnapshot: attachedFolders.map((folder) => toAttachedFolderSnapshot(folder)),
    resolvedDocumentSnapshot: resolvedDocuments.map((document) =>
      toResolvedDocumentSnapshot(document),
    ),
  };
}
