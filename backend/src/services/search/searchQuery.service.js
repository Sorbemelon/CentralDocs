import { FILE_KINDS } from "../../constants/document.constants.js";
import {
  SEARCH_ERROR_CODE,
  SEARCH_LIMITS,
  SEARCH_SCOPE,
  SEARCH_SCOPES,
} from "../../constants/search.constants.js";
import { createHttpError } from "../../utils/httpError.js";

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function validateQuery(query) {
  const trimmed = String(query || "").trim();
  if (!trimmed) {
    throw createHttpError(400, "Semantic search query is required.", SEARCH_ERROR_CODE.SEARCH_QUERY_EMPTY);
  }
  if (trimmed.length > SEARCH_LIMITS.maxQueryLengthChars) {
    throw createHttpError(
      400,
      "Semantic search query is too long.",
      SEARCH_ERROR_CODE.SEARCH_QUERY_TOO_LONG,
      { maxLength: SEARCH_LIMITS.maxQueryLengthChars },
    );
  }

  return trimmed;
}

function normalizeTopK(topK) {
  if (topK === undefined || topK === null || topK === "") {
    return SEARCH_LIMITS.defaultTopK;
  }

  const numericTopK = Number(topK);
  if (!Number.isInteger(numericTopK) || numericTopK < 1 || numericTopK > SEARCH_LIMITS.maxTopK) {
    throw createHttpError(
      400,
      `topK must be an integer from 1 to ${SEARCH_LIMITS.maxTopK}.`,
      SEARCH_ERROR_CODE.INVALID_SEARCH_TOP_K,
      { maxTopK: SEARCH_LIMITS.maxTopK },
    );
  }

  return numericTopK;
}

function validateScope(scope) {
  const value = scope || SEARCH_SCOPE.ALL;
  if (!SEARCH_SCOPES.includes(value)) {
    throw createHttpError(
      400,
      "Unsupported semantic search scope.",
      SEARCH_ERROR_CODE.INVALID_SEARCH_SCOPE,
    );
  }

  return value;
}

function validateFileKinds(fileKinds) {
  const values = normalizeStringList(fileKinds);
  const invalid = values.find((fileKind) => !FILE_KINDS.includes(fileKind));
  if (invalid) {
    throw createHttpError(
      400,
      "Unsupported file kind filter.",
      SEARCH_ERROR_CODE.INVALID_FILE_KIND,
      { fileKind: invalid },
    );
  }

  return [...new Set(values)];
}

export function buildSearchRequest(body = {}) {
  return {
    query: validateQuery(body.query),
    selectedDocumentIds: [...new Set(normalizeStringList(body.selectedDocumentIds))],
    selectedFolderIds: [...new Set(normalizeStringList(body.selectedFolderIds))],
    scope: validateScope(body.scope),
    fileKinds: validateFileKinds(body.fileKinds),
    topK: normalizeTopK(body.topK),
  };
}

export function hasSearchSelection(request = {}) {
  return (
    (request.selectedDocumentIds || []).length > 0 ||
    (request.selectedFolderIds || []).length > 0
  );
}
