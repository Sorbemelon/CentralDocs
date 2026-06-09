import { EMBEDDING_ERROR_CODE, EMBEDDING_TASK_TYPE } from "../../constants/embedding.constants.js";
import { SEARCH_ERROR_CODE } from "../../constants/search.constants.js";
import { createHttpError, HttpError } from "../../utils/httpError.js";
import { embedText } from "../ai/geminiEmbedding.service.js";
import { buildSearchRequest, hasSearchSelection } from "./searchQuery.service.js";
import {
  assertNonEmptySearchScope,
  resolveSearchScope,
} from "./searchScope.service.js";
import { executeVectorSearch } from "./vectorSearch.repository.js";
import { buildSearchReferences } from "./searchReference.service.js";
import { toSemanticSearchResponseDto } from "./searchResult.dto.js";

const defaultDependencies = Object.freeze({
  queryEmbedder: embedText,
  scopeResolver: resolveSearchScope,
  vectorRepository: { executeVectorSearch },
});

let semanticSearchTestDependencies = {};

function getDependencies(overrides = {}) {
  return {
    ...defaultDependencies,
    ...semanticSearchTestDependencies,
    ...overrides,
  };
}

function toSearchEmbeddingError(error) {
  if (error instanceof HttpError && error.code !== EMBEDDING_ERROR_CODE.EMBEDDING_NOT_CONFIGURED) {
    return error;
  }

  if (
    error?.code === EMBEDDING_ERROR_CODE.EMBEDDING_NOT_CONFIGURED ||
    error?.code === SEARCH_ERROR_CODE.SEARCH_EMBEDDING_UNAVAILABLE
  ) {
    return createHttpError(
      503,
      "Semantic search query embedding is unavailable.",
      SEARCH_ERROR_CODE.SEARCH_EMBEDDING_UNAVAILABLE,
    );
  }

  return createHttpError(
    503,
    "Semantic search query embedding is unavailable.",
    SEARCH_ERROR_CODE.SEARCH_EMBEDDING_UNAVAILABLE,
  );
}

function toSearchVectorError(error) {
  if (error instanceof HttpError) {
    return error;
  }

  return createHttpError(
    500,
    "Semantic search failed.",
    SEARCH_ERROR_CODE.SEARCH_FAILED,
  );
}

export function setSemanticSearchDependenciesForTests(overrides = {}) {
  semanticSearchTestDependencies = overrides;
}

export function resetSemanticSearchDependenciesForTests() {
  semanticSearchTestDependencies = {};
}

export async function semanticSearch({
  body = {},
  demoSessionId = null,
  dependencies = {},
} = {}) {
  const request = buildSearchRequest(body);
  const deps = getDependencies(dependencies);

  let embeddingResult;
  try {
    embeddingResult = await deps.queryEmbedder({
      text: request.query,
      taskType: EMBEDDING_TASK_TYPE.RETRIEVAL_QUERY,
      title: "CentralDocs semantic search query",
    });
  } catch (error) {
    throw toSearchEmbeddingError(error);
  }

  const scope = await deps.scopeResolver({
    request,
    demoSessionId,
    repositories: deps.repositories || {},
  });
  assertNonEmptySearchScope(scope, request);

  if ((scope.resolvedDocumentIds || []).length === 0) {
    return toSemanticSearchResponseDto({
      request,
      scope,
      matches: [],
      references: [],
      embeddingResult,
      warnings: hasSearchSelection(request)
        ? []
        : [{ code: "NO_SEARCHABLE_DOCUMENTS", message: "No searchable documents are available." }],
    });
  }

  let matches;
  try {
    matches = await deps.vectorRepository.executeVectorSearch({
      queryVector: embeddingResult.embedding,
      topK: request.topK,
      scope,
    });
  } catch (error) {
    throw toSearchVectorError(error);
  }

  const references = buildSearchReferences({
    matches,
    documentsById: scope.documentsById,
  });

  return toSemanticSearchResponseDto({
    request,
    scope,
    matches,
    references,
    embeddingResult,
    warnings: [],
  });
}
