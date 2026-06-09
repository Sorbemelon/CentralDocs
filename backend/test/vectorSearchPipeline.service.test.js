import { test } from "node:test";
import assert from "node:assert/strict";

const {
  buildVectorSearchFilter,
  buildVectorSearchPipeline,
} = await import("../src/services/search/vectorSearchPipeline.service.js");

function fakeVector(value = 0.1) {
  return Array.from({ length: 768 }, () => value);
}

test("vector search pipeline builds Atlas vector stage", () => {
  const pipeline = buildVectorSearchPipeline({
    queryVector: fakeVector(),
    topK: 6,
    resolvedDocumentIds: ["507f1f77bcf86cd799439011"],
    allowedScopes: ["mock", "user", "generated"],
    demoSessionId: "demo_123",
  });

  assert.equal(pipeline[0].$vectorSearch.index, "document_chunks_vector_index");
  assert.equal(pipeline[0].$vectorSearch.path, "embedding");
  assert.equal(pipeline[0].$vectorSearch.queryVector.length, 768);
  assert.equal(pipeline[0].$vectorSearch.limit, 6);
  assert.equal(pipeline[0].$vectorSearch.numCandidates, 120);
  assert.equal(pipeline[0].$vectorSearch.filter.lifecycleStatus, "active");
  assert.deepEqual(pipeline[0].$vectorSearch.filter.chunkKind, { $in: ["text", "media_direct"] });
  assert.equal(pipeline[1].$project.embedding, undefined);
  assert.deepEqual(pipeline[1].$project.score, { $meta: "vectorSearchScore" });
});

test("vector search filter includes resolved documents and scope visibility", () => {
  const filter = buildVectorSearchFilter({
    resolvedDocumentIds: ["507f1f77bcf86cd799439011", "mock_doc"],
    allowedScopes: ["mock", "user"],
    demoSessionId: "demo_123",
  });

  assert.equal(filter.documentId.$in.length, 2);
  assert.equal(filter.$or[0].scope, "mock");
  assert.equal(filter.$or[0].demoSessionId, null);
  assert.deepEqual(filter.$or[1].scope, { $in: ["user"] });
  assert.equal(filter.$or[1].demoSessionId, "demo_123");
});

test("vector search pipeline validates query vector dimensions", () => {
  assert.throws(
    () => buildVectorSearchPipeline({ queryVector: [0.1], topK: 6 }),
    { code: "INVALID_EMBEDDING_DIMENSIONS" },
  );
});

test("vector search pipeline does not include API keys or object keys", () => {
  const pipeline = buildVectorSearchPipeline({
    queryVector: fakeVector(),
    topK: 6,
    resolvedDocumentIds: ["mock_doc"],
    allowedScopes: ["mock"],
  });
  const serialized = JSON.stringify(pipeline);

  assert.equal(serialized.includes("apiKey"), false);
  assert.equal(serialized.includes("objectKey"), false);
});
