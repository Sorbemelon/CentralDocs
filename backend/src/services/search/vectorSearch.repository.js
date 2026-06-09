import { isMongoConnected } from "../../db/connectMongo.js";
import { DocumentChunk } from "../../models/DocumentChunk.model.js";
import { createHttpError, HttpError } from "../../utils/httpError.js";
import { SEARCH_ERROR_CODE } from "../../constants/search.constants.js";
import { buildVectorSearchPipeline } from "./vectorSearchPipeline.service.js";

function serializeId(value) {
  if (!value) {
    return null;
  }

  return String(value);
}

function toContentPreview(content = "") {
  return String(content || "").slice(0, 500);
}

function toSafeVectorMatch(match = {}) {
  return {
    chunkId: serializeId(match._id || match.id || match.chunkId),
    documentId: serializeId(match.documentId),
    folderId: serializeId(match.folderId),
    demoSessionId: match.demoSessionId || null,
    chunkIndex: match.chunkIndex ?? null,
    content: match.content || "",
    contentPreview: toContentPreview(match.contentPreview || match.content),
    score: typeof match.score === "number" ? match.score : null,
    sourceLocator: match.sourceLocator || {},
    chunkKind: match.chunkKind || "text",
    embeddingInputType: match.embeddingInputType || "text",
    tokenEstimate: match.tokenEstimate || 0,
    scope: match.scope || null,
  };
}

function requireSearchPersistence({ model = null } = {}) {
  if (model) {
    return;
  }
  if (!isMongoConnected()) {
    throw createHttpError(
      503,
      "Semantic search persistence is not configured.",
      SEARCH_ERROR_CODE.SEARCH_PERSISTENCE_NOT_CONFIGURED,
    );
  }
}

export async function executeVectorSearch({
  queryVector,
  topK,
  scope,
  model = null,
  pipelineBuilder = buildVectorSearchPipeline,
} = {}) {
  requireSearchPersistence({ model });
  const chunkModel = model || DocumentChunk;
  const pipeline = pipelineBuilder({
    queryVector,
    topK,
    resolvedDocumentIds: scope?.resolvedDocumentIds || [],
    allowedScopes: scope?.allowedScopes || [],
    demoSessionId: scope?.demoSessionId || null,
  });

  try {
    const result = await chunkModel.aggregate(pipeline);
    return (result || []).map((match) => toSafeVectorMatch(match));
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw createHttpError(
      500,
      "Semantic vector search query failed.",
      SEARCH_ERROR_CODE.SEARCH_VECTOR_QUERY_FAILED,
    );
  }
}
