import { SEARCH_EMBEDDING } from "../../constants/search.constants.js";

function serializeId(value) {
  if (!value) {
    return null;
  }

  return String(value);
}

function toScopeDto(scope = {}) {
  return {
    selectedDocumentIds: scope.selectedDocumentIds || [],
    selectedFolderIds: scope.selectedFolderIds || [],
    resolvedDocumentIds: (scope.resolvedDocumentIds || []).map((documentId) => serializeId(documentId)),
    scope: scope.scope || "all",
  };
}

function toSearchResultDto({ match = {}, reference = {}, document = {} } = {}) {
  return {
    referenceNumber: reference.citationNumber,
    documentId: reference.documentId || serializeId(match.documentId),
    documentTitle: reference.documentTitle || document.title || null,
    fileKind: document.fileKind || reference.fileType || null,
    folderName: reference.folderName || document.folderName || null,
    chunkId: serializeId(match.chunkId),
    chunkIndex: match.chunkIndex ?? null,
    chunkKind: match.chunkKind || "text",
    embeddingInputType: match.embeddingInputType || "text",
    contentPreview: reference.excerptPreview || match.contentPreview || "",
    score: typeof match.score === "number" ? match.score : null,
    sourceLocator: match.sourceLocator || {},
  };
}

export function toSemanticSearchResponseDto({
  request,
  scope,
  matches = [],
  references = [],
  warnings = [],
  embeddingResult = {},
} = {}) {
  const documentsById = scope?.documentsById || new Map();
  const results = matches.map((match, index) =>
    toSearchResultDto({
      match,
      reference: references[index],
      document: documentsById.get(serializeId(match.documentId)) || {},
    }),
  );

  return {
    query: request.query,
    topK: request.topK,
    scope: toScopeDto(scope),
    results,
    references,
    stats: {
      resultCount: results.length,
      searchedDocumentCount: scope?.searchedDocumentCount || 0,
      embeddingModel: embeddingResult.model || SEARCH_EMBEDDING.model,
      embeddingDimensions: embeddingResult.dimensions || SEARCH_EMBEDDING.dimensions,
    },
    warnings,
  };
}
