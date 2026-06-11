import { DEMO_LIMITS } from "../config/limits.js";
import { getVectorIndexName, getVectorPath } from "../config/env.js";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, EMBEDDING_PROVIDER } from "./embedding.constants.js";

export const SEARCH_SCOPE = Object.freeze({
  ALL: "all",
  MOCK: "mock",
  USER: "user",
  GENERATED: "generated",
});

export const SEARCH_SCOPES = Object.freeze(Object.values(SEARCH_SCOPE));

export const SEARCH_LIMITS = Object.freeze({
  maxQueryLengthChars: DEMO_LIMITS.maxSemanticSearchQueryLengthChars,
  defaultTopK: DEMO_LIMITS.topKRetrieval,
  maxTopK: 10,
  excerptPreviewChars: 300,
});

export const VECTOR_SEARCH = Object.freeze({
  indexName: getVectorIndexName(),
  path: getVectorPath(),
  numCandidatesMultiplier: 20,
  minNumCandidates: 100,
  chunkKinds: ["text", "media_direct"],
});

export const SEARCH_EMBEDDING = Object.freeze({
  provider: EMBEDDING_PROVIDER,
  model: EMBEDDING_MODEL,
  dimensions: EMBEDDING_DIMENSIONS,
});

export const SEARCH_ERROR_CODE = Object.freeze({
  SEARCH_QUERY_EMPTY: "SEARCH_QUERY_EMPTY",
  SEARCH_QUERY_TOO_LONG: "SEARCH_QUERY_TOO_LONG",
  INVALID_SEARCH_SCOPE: "INVALID_SEARCH_SCOPE",
  INVALID_SEARCH_TOP_K: "INVALID_SEARCH_TOP_K",
  INVALID_FILE_KIND: "INVALID_FILE_KIND",
  SEARCH_EMBEDDING_UNAVAILABLE: "SEARCH_EMBEDDING_UNAVAILABLE",
  SEARCH_PERSISTENCE_NOT_CONFIGURED: "SEARCH_PERSISTENCE_NOT_CONFIGURED",
  SEARCH_VECTOR_QUERY_FAILED: "SEARCH_VECTOR_QUERY_FAILED",
  SEARCH_SCOPE_EMPTY: "SEARCH_SCOPE_EMPTY",
  DOCUMENT_NOT_SEARCHABLE: "DOCUMENT_NOT_SEARCHABLE",
  SEARCH_FAILED: "SEARCH_FAILED",
});
