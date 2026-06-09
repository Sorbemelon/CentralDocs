import { test } from "node:test";
import assert from "node:assert/strict";

const { executeVectorSearch } = await import("../src/services/search/vectorSearch.repository.js");

function fakeVector(value = 0.1) {
  return Array.from({ length: 768 }, () => value);
}

test("vector search repository calls aggregate with built pipeline", async () => {
  let capturedPipeline = null;
  const model = {
    aggregate: async (pipeline) => {
      capturedPipeline = pipeline;
      return [
        {
          _id: "chunk_1",
          documentId: "doc_1",
          folderId: "folder_1",
          chunkIndex: 3,
          content: "Customer feedback mentions document search delays.",
          score: 0.91,
          sourceLocator: { pageNumber: 2 },
          chunkKind: "text",
          embeddingInputType: "text",
          tokenEstimate: 12,
          scope: "mock",
          embedding: fakeVector(),
          objectKey: "mock/private/key",
          localPath: "D:\\private\\source.md",
        },
      ];
    },
  };

  const matches = await executeVectorSearch({
    queryVector: fakeVector(),
    topK: 6,
    scope: {
      resolvedDocumentIds: ["doc_1"],
      allowedScopes: ["mock"],
    },
    model,
  });

  assert.equal(capturedPipeline[0].$vectorSearch.index, "document_chunks_vector_index");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].chunkId, "chunk_1");
  assert.equal(matches[0].contentPreview, "Customer feedback mentions document search delays.");
  assert.equal(matches[0].score, 0.91);
  assert.equal(matches[0].sourceLocator.pageNumber, 2);
  assert.equal("embedding" in matches[0], false);
  assert.equal("objectKey" in matches[0], false);
  assert.equal(JSON.stringify(matches[0]).includes("private"), false);
});

test("vector search repository reports persistence not configured without fake model", async () => {
  await assert.rejects(
    () =>
      executeVectorSearch({
        queryVector: fakeVector(),
        topK: 6,
        scope: { resolvedDocumentIds: ["doc_1"], allowedScopes: ["mock"] },
      }),
    {
      statusCode: 503,
      code: "SEARCH_PERSISTENCE_NOT_CONFIGURED",
    },
  );
});

test("vector search repository handles aggregation errors safely", async () => {
  await assert.rejects(
    () =>
      executeVectorSearch({
        queryVector: fakeVector(),
        topK: 6,
        scope: { resolvedDocumentIds: ["doc_1"], allowedScopes: ["mock"] },
        model: {
          aggregate: async () => {
            throw new Error("mongodb://SECRET_CONNECTION");
          },
        },
      }),
    (error) => {
      assert.equal(error.code, "SEARCH_VECTOR_QUERY_FAILED");
      assert.equal(JSON.stringify(error).includes("SECRET_CONNECTION"), false);
      return true;
    },
  );
});
