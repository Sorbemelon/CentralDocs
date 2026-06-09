export function toDocumentChunkDto(chunk = {}) {
  return {
    id: chunk._id ? String(chunk._id) : chunk.id ? String(chunk.id) : null,
    documentId: chunk.documentId ? String(chunk.documentId) : null,
    demoSessionId: chunk.demoSessionId || null,
    folderId: chunk.folderId ? String(chunk.folderId) : null,
    scope: chunk.scope || null,
    chunkIndex: chunk.chunkIndex ?? null,
    contentPreview: String(chunk.content || "").slice(0, 500),
    embeddingModel: chunk.embeddingModel || null,
    embeddingDimensions: chunk.embeddingDimensions || null,
    tokenEstimate: chunk.tokenEstimate || 0,
    sourceLocator: chunk.sourceLocator || {},
    chunkKind: chunk.chunkKind || "text",
    embeddingInputType: chunk.embeddingInputType || "text",
    mediaMeta: chunk.mediaMeta
      ? {
          directMultimodal: Boolean(chunk.mediaMeta.directMultimodal),
          seededAt: chunk.mediaMeta.seededAt || null,
          sourceMimeType: chunk.mediaMeta.sourceMimeType || null,
          sourceFilename: chunk.mediaMeta.sourceFilename || null,
        }
      : null,
    lifecycleStatus: chunk.lifecycleStatus || null,
    createdAt: chunk.createdAt || null,
  };
}

export function toDocumentChunkDtos(chunks = []) {
  return chunks.map((chunk) => toDocumentChunkDto(chunk));
}
