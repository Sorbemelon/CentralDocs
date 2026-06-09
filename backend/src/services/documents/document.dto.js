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

function serializeIdList(values = []) {
  return values.map((value) => serializeId(value)).filter(Boolean);
}

function toGeneratedMetaSummary(generatedMeta) {
  if (!generatedMeta) {
    return null;
  }

  return {
    fromChatSessionId: serializeId(generatedMeta.fromChatSessionId),
    generationInstruction: generatedMeta.generationInstruction || null,
    sourceMessageIds: serializeIdList(generatedMeta.sourceMessageIds),
    sourceDocumentIds: serializeIdList(generatedMeta.sourceDocumentIds),
    referencesIncluded: Boolean(generatedMeta.referencesIncluded),
  };
}

function toMediaMetaSummary(mediaMeta) {
  if (!mediaMeta) {
    return null;
  }

  return {
    directMultimodalEmbeddingSeeded: Boolean(mediaMeta.directMultimodalEmbeddingSeeded),
    transcriptDocumentId: serializeId(mediaMeta.transcriptDocumentId),
    durationSeconds: mediaMeta.durationSeconds ?? null,
  };
}

function toContentStats(contentStats = {}) {
  return {
    extractedCharCount: contentStats.extractedCharCount || 0,
    optimizedCharCount: contentStats.optimizedCharCount || 0,
    estimatedTokenCount: contentStats.estimatedTokenCount || 0,
    chunkCount: contentStats.chunkCount || 0,
  };
}

function isReadyActive(raw = {}) {
  return raw.status === "ready" && raw.lifecycleStatus === "active";
}

export function toDocumentDto(document, { includePreview = false } = {}) {
  const raw = document?.toObject ? document.toObject() : document;
  const contentStats = toContentStats(raw.contentStats);
  const readyActive = isReadyActive(raw);
  const dto = {
    id: serializeId(raw.mockId || raw.id || raw._id),
    title: raw.title,
    originalFilename: raw.originalFilename,
    downloadFilename: raw.downloadFilename,
    fileExtension: raw.fileExtension,
    mimeType: raw.mimeType,
    fileKind: raw.fileKind,
    folderId: serializeId(raw.folderId),
    folderName: raw.folderName || null,
    scope: raw.scope,
    sourceType: raw.sourceType,
    readOnly: Boolean(raw.readOnly),
    status: raw.status,
    statusMessage: raw.statusMessage || null,
    lifecycleStatus: raw.lifecycleStatus,
    sizeBytes: raw.sizeBytes || 0,
    contentStats,
    generatedMeta: toGeneratedMetaSummary(raw.generatedMeta),
    mediaMeta: toMediaMetaSummary(raw.mediaMeta),
    processing: {
      status: raw.status,
      statusMessage: raw.statusMessage || null,
    },
    searchable: Boolean(readyActive && contentStats.chunkCount > 0),
    createdAt: serializeDate(raw.createdAt),
    updatedAt: serializeDate(raw.updatedAt),
    expiresAt: serializeDate(raw.expiresAt),
  };

  if (raw.description) {
    dto.description = raw.description;
  }
  if (raw.manifestPath) {
    dto.manifestPath = raw.manifestPath;
  }
  if (raw.demoQuestions) {
    dto.demoQuestions = raw.demoQuestions;
  }
  if (raw.downloadAvailable !== undefined) {
    dto.downloadAvailable = raw.downloadAvailable;
  } else if (raw.objectKey && raw.lifecycleStatus === "active") {
    dto.downloadAvailable = true;
  }
  if (raw.attachable !== undefined) {
    dto.attachable = Boolean(raw.attachable);
  } else {
    dto.attachable = Boolean(readyActive);
  }
  if (includePreview) {
    dto.extractedTextPreview = raw.extractedTextPreview || raw.previewText || null;
  }

  return dto;
}

export function toDocumentDtos(documents = [], options = {}) {
  return documents.map((document) => toDocumentDto(document, options));
}
