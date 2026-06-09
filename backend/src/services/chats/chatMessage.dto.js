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

function rawObject(value) {
  return value?.toObject ? value.toObject() : value;
}

function toAttachedDocumentSnapshots(values = []) {
  return values.map((value) => {
    const raw = rawObject(value);
    return {
      id: serializeId(raw.id),
      title: raw.title || null,
      fileKind: raw.fileKind || null,
      sourceType: raw.sourceType || null,
      scope: raw.scope || null,
      folderId: serializeId(raw.folderId),
      folderName: raw.folderName || null,
      status: raw.status || null,
      lifecycleStatus: raw.lifecycleStatus || null,
    };
  });
}

function toAttachedFolderSnapshots(values = []) {
  return values.map((value) => {
    const raw = rawObject(value);
    return {
      id: serializeId(raw.id),
      name: raw.name || null,
      scope: raw.scope || null,
      path: raw.path || null,
      readOnly: Boolean(raw.readOnly),
      lifecycleStatus: raw.lifecycleStatus || null,
    };
  });
}

function toResolvedDocumentSnapshots(values = []) {
  return values.map((value) => {
    const raw = rawObject(value);
    return {
      id: serializeId(raw.id),
      title: raw.title || null,
      fileKind: raw.fileKind || null,
      sourceType: raw.sourceType || null,
      scope: raw.scope || null,
      folderId: serializeId(raw.folderId),
      folderName: raw.folderName || null,
      resolvedFromFolderIds: (raw.resolvedFromFolderIds || [])
        .map((folderId) => serializeId(folderId))
        .filter(Boolean),
      status: raw.status || null,
      lifecycleStatus: raw.lifecycleStatus || null,
    };
  });
}

function toReferencesUsed(values = []) {
  return values.map((value) => {
    const raw = rawObject(value);
    return {
      citationNumber: raw.citationNumber,
      documentId: serializeId(raw.documentId),
      documentTitle: raw.documentTitle || null,
      fileType: raw.fileType || null,
      folderName: raw.folderName || null,
      chunkId: serializeId(raw.chunkId),
      sectionTitle: raw.sectionTitle || null,
      pageNumber: raw.pageNumber ?? null,
      slideNumber: raw.slideNumber ?? null,
      sheetName: raw.sheetName || null,
      rowRange: raw.rowRange || null,
      mediaTimestamp: raw.mediaTimestamp || null,
      excerptPreview: raw.excerptPreview || null,
      similarityScore: raw.similarityScore ?? null,
      usedFor: raw.usedFor || null,
    };
  });
}

export function toChatMessageDto(message = {}) {
  const raw = message?.toObject ? message.toObject() : message;

  return {
    id: serializeId(raw.id || raw._id),
    chatSessionId: serializeId(raw.chatSessionId),
    role: raw.role,
    content: raw.content,
    status: raw.status,
    attachedDocumentSnapshot: toAttachedDocumentSnapshots(raw.attachedDocumentSnapshot),
    attachedFolderSnapshot: toAttachedFolderSnapshots(raw.attachedFolderSnapshot),
    resolvedDocumentSnapshot: toResolvedDocumentSnapshots(raw.resolvedDocumentSnapshot),
    referencesUsed: toReferencesUsed(raw.referencesUsed),
    aiMeta: raw.aiMeta || null,
    createdAt: serializeDate(raw.createdAt),
  };
}

export function toChatMessageDtos(messages = []) {
  return messages.map((message) => toChatMessageDto(message));
}
