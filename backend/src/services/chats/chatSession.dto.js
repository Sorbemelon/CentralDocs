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

export function toChatSessionDto(chatSession = {}, { resolvedDocumentCount = undefined } = {}) {
  const raw = chatSession?.toObject ? chatSession.toObject() : chatSession;
  const currentSelectedDocumentIds = serializeIdList(raw.currentSelectedDocumentIds);
  const currentSelectedFolderIds = serializeIdList(raw.currentSelectedFolderIds);

  const dto = {
    id: serializeId(raw.id || raw._id),
    title: raw.title,
    currentSelectedDocumentIds,
    currentSelectedFolderIds,
    currentSelectedDocumentCount: currentSelectedDocumentIds.length,
    currentSelectedFolderCount: currentSelectedFolderIds.length,
    rollingSummary: raw.rollingSummary || null,
    messageCount: raw.messageCount || 0,
    aiPromptCount: raw.aiPromptCount || 0,
    archivedAt: serializeDate(raw.archivedAt),
    lifecycleStatus: raw.lifecycleStatus,
    createdAt: serializeDate(raw.createdAt),
    updatedAt: serializeDate(raw.updatedAt),
    lastMessageAt: serializeDate(raw.lastMessageAt),
  };

  if (resolvedDocumentCount !== undefined) {
    dto.resolvedDocumentCount = resolvedDocumentCount;
  }

  return dto;
}

export function toChatSessionDtos(chatSessions = []) {
  return chatSessions.map((chatSession) => toChatSessionDto(chatSession));
}
