import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const {
  assertEmbeddingDimensions,
  isNumericVector,
  normalizeEmbeddingVectorShape,
  summarizeEmbeddingVector,
  validateEmbeddingVector,
} = await import("../src/services/embedding/embeddingVector.service.js");

const goodVector = Array.from({ length: 768 }, (_, index) => index / 1000);

test("embedding vector service accepts finite 768-number vector", () => {
  assert.equal(isNumericVector(goodVector), true);
  assert.equal(validateEmbeddingVector(goodVector).length, 768);
  assert.equal(assertEmbeddingDimensions(goodVector, 768), goodVector);
});

test("embedding vector service normalizes provider vector shape", () => {
  assert.deepEqual(normalizeEmbeddingVectorShape({ values: [1, 2, 3] }), [1, 2, 3]);
  assert.deepEqual(normalizeEmbeddingVectorShape({ embedding: { values: [1] } }), [1]);
});

test("embedding vector service rejects wrong dimensions", () => {
  assert.throws(() => validateEmbeddingVector([1, 2, 3]), {
    statusCode: 500,
    code: "INVALID_EMBEDDING_DIMENSIONS",
  });
});

test("embedding vector service rejects NaN, Infinity, and non-array values", () => {
  assert.throws(() => validateEmbeddingVector([Number.NaN]), {
    code: "INVALID_EMBEDDING_VECTOR",
  });
  assert.throws(() => validateEmbeddingVector([Infinity]), {
    code: "INVALID_EMBEDDING_VECTOR",
  });
  assert.throws(() => validateEmbeddingVector("not a vector"), {
    code: "INVALID_EMBEDDING_VECTOR",
  });
});

test("embedding vector summary does not include full vector", () => {
  const summary = summarizeEmbeddingVector(goodVector);

  assert.deepEqual(summary, { dimensions: 768, numeric: true });
  assert.equal(JSON.stringify(summary).includes(String(goodVector[10])), false);
});
