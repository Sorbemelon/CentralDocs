function serializeDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function serializeId(value) {
  if (!value) {
    return null;
  }

  return String(value);
}

export function toFolderDto(folder) {
  const raw = folder?.toObject ? folder.toObject() : folder;

  return {
    id: serializeId(raw.mockId || raw.id || raw._id),
    name: raw.name,
    parentFolderId: serializeId(raw.parentFolderId),
    path: raw.path,
    scope: raw.scope,
    readOnly: Boolean(raw.readOnly),
    lifecycleStatus: raw.lifecycleStatus,
    documentCount: raw.documentCount || 0,
    createdAt: serializeDate(raw.createdAt),
    updatedAt: serializeDate(raw.updatedAt),
  };
}

export function toFolderDtos(folders = []) {
  return folders.map((folder) => toFolderDto(folder));
}
