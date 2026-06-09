import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_ERROR_CODE,
} from "../../constants/embedding.constants.js";
import { createHttpError } from "../../utils/httpError.js";

export function normalizeEmbeddingVectorShape(vector) {
  if (Array.isArray(vector)) {
    return vector;
  }
  if (Array.isArray(vector?.values)) {
    return vector.values;
  }
  if (Array.isArray(vector?.embedding?.values)) {
    return vector.embedding.values;
  }

  return vector;
}

export function isNumericVector(vector) {
  return Array.isArray(vector) && vector.every((value) => typeof value === "number" && Number.isFinite(value));
}

export function assertEmbeddingDimensions(vector, expectedDimensions = EMBEDDING_DIMENSIONS) {
  if (!Array.isArray(vector) || vector.length !== expectedDimensions) {
    throw createHttpError(
      500,
      "Embedding vector dimensions are invalid.",
      EMBEDDING_ERROR_CODE.INVALID_EMBEDDING_DIMENSIONS,
      {
        expectedDimensions,
        actualDimensions: Array.isArray(vector) ? vector.length : null,
      },
    );
  }

  return vector;
}

export function validateEmbeddingVector(vector, expectedDimensions = EMBEDDING_DIMENSIONS) {
  const normalized = normalizeEmbeddingVectorShape(vector);
  if (!isNumericVector(normalized)) {
    throw createHttpError(
      500,
      "Embedding vector must be an array of finite numbers.",
      EMBEDDING_ERROR_CODE.INVALID_EMBEDDING_VECTOR,
    );
  }

  return assertEmbeddingDimensions(normalized, expectedDimensions);
}

export function summarizeEmbeddingVector(vector) {
  const normalized = normalizeEmbeddingVectorShape(vector);
  return {
    dimensions: Array.isArray(normalized) ? normalized.length : 0,
    numeric: isNumericVector(normalized),
  };
}
