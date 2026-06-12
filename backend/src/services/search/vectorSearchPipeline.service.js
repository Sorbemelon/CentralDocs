import mongoose from "mongoose";
import { LIFECYCLE_STATUS } from "../../constants/lifecycle.constants.js";
import {
  SEARCH_EMBEDDING,
  SEARCH_LIMITS,
  VECTOR_SEARCH,
} from "../../constants/search.constants.js";
import { validateEmbeddingVector } from "../embedding/embeddingVector.service.js";

function toMongoComparableId(value) {
  const stringValue = String(value || "");
  if (mongoose.Types.ObjectId.isValid(stringValue)) {
    return new mongoose.Types.ObjectId(stringValue);
  }

  return stringValue;
}

function buildScopeFilter({ allowedScopes = [], demoSessionId = null } = {}) {
  const scopeFilters = [];

  if (allowedScopes.includes("mock")) {
    scopeFilters.push({
      scope: "mock",
      demoSessionId: null,
    });
  }

  const sessionScopes = allowedScopes.filter((scope) => scope !== "mock");
  if (sessionScopes.length > 0 && demoSessionId) {
    scopeFilters.push({
      scope: { $in: sessionScopes },
      demoSessionId,
    });
  }

  return scopeFilters.length > 0 ? { $or: scopeFilters } : {};
}

export function buildVectorSearchFilter({
  resolvedDocumentIds = [],
  allowedScopes = [],
  demoSessionId = null,
} = {}) {
  const filter = {
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
    chunkKind: { $in: VECTOR_SEARCH.chunkKinds },
    ...buildScopeFilter({ allowedScopes, demoSessionId }),
  };

  if (resolvedDocumentIds.length > 0) {
    filter.documentId = {
      $in: resolvedDocumentIds.map((documentId) => toMongoComparableId(documentId)),
    };
  }

  return filter;
}

export function buildVectorSearchPipeline({
  queryVector,
  topK,
  resolvedDocumentIds = [],
  allowedScopes = [],
  demoSessionId = null,
} = {}) {
  const vector = validateEmbeddingVector(queryVector, SEARCH_EMBEDDING.dimensions);
  const limit = Number.isInteger(topK) && topK > 0 ? topK : SEARCH_LIMITS.defaultTopK;
  const numCandidates = Math.max(
    VECTOR_SEARCH.minNumCandidates,
    limit * VECTOR_SEARCH.numCandidatesMultiplier,
  );

  return [
    {
      $vectorSearch: {
        index: VECTOR_SEARCH.indexName,
        path: VECTOR_SEARCH.path,
        queryVector: vector,
        numCandidates,
        limit,
        filter: buildVectorSearchFilter({
          resolvedDocumentIds,
          allowedScopes,
          demoSessionId,
        }),
      },
    },
    {
      $project: {
        _id: 1,
        documentId: 1,
        demoSessionId: 1,
        folderId: 1,
        scope: 1,
        chunkIndex: 1,
        content: 1,
        tokenEstimate: 1,
        sourceLocator: 1,
        chunkKind: 1,
        embeddingInputType: 1,
        lifecycleStatus: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ];
}
