import { test } from "node:test";
import assert from "node:assert/strict";

const { semanticSearch } = await import("../src/services/search/semanticSearch.service.js");
const { createHttpError } = await import("../src/utils/httpError.js");

function fakeVector(value = 0.1) {
  return Array.from({ length: 768 }, () => value);
}

function scopeResult() {
  return {
    scope: "all",
    selectedDocumentIds: [],
    selectedFolderIds: [],
    resolvedDocumentIds: ["doc_1"],
    allowedScopes: ["mock", "user", "generated"],
    demoSessionId: "demo_123",
    searchedDocumentCount: 1,
    documentsById: new Map([
      ["doc_1", { id: "doc_1", title: "Customer Feedback", fileKind: "csv", folderName: "Support" }],
    ]),
  };
}

test("semantic search service embeds query and searches vector repository", async () => {
  const calls = [];
  const body = {
    query: "  customer pain points  ",
    topK: 6,
    selectedDocumentIds: [],
    selectedFolderIds: [],
  };
  const original = structuredClone(body);
  const response = await semanticSearch({
    body,
    demoSessionId: "demo_123",
    dependencies: {
      queryEmbedder: async ({ text, taskType }) => {
        calls.push({ text, taskType });
        return {
          model: "gemini-embedding-2",
          dimensions: 768,
          embedding: fakeVector(0.2),
          provider: "gemini",
        };
      },
      scopeResolver: async ({ request, demoSessionId }) => ({
        ...scopeResult(),
        scope: request.scope,
        demoSessionId,
      }),
      vectorRepository: {
        executeVectorSearch: async ({ queryVector, topK, scope }) => {
          assert.equal(queryVector.length, 768);
          assert.equal(topK, 6);
          assert.deepEqual(scope.resolvedDocumentIds, ["doc_1"]);
          return [{
            chunkId: "chunk_1",
            documentId: "doc_1",
            chunkIndex: 0,
            content: "Customer feedback mentions document search.",
            contentPreview: "Customer feedback mentions document search.",
            score: 0.92,
            sourceLocator: { rowStart: 4, rowEnd: 4 },
            chunkKind: "text",
            embeddingInputType: "text",
            scope: "mock",
          }];
        },
      },
    },
  });

  assert.deepEqual(body, original);
  assert.deepEqual(calls, [{ text: "customer pain points", taskType: "RETRIEVAL_QUERY" }]);
  assert.equal(response.results.length, 1);
  assert.equal(response.references[0].citationNumber, 1);
  assert.equal(response.stats.embeddingModel, "gemini-embedding-2");
  assert.equal("answer" in response, false);
});

test("semantic search service handles no vector results", async () => {
  const response = await semanticSearch({
    body: { query: "risk" },
    dependencies: {
      queryEmbedder: async () => ({
        model: "gemini-embedding-2",
        dimensions: 768,
        embedding: fakeVector(),
      }),
      scopeResolver: async () => scopeResult(),
      vectorRepository: {
        executeVectorSearch: async () => [],
      },
    },
  });

  assert.deepEqual(response.results, []);
  assert.deepEqual(response.references, []);
  assert.equal(response.stats.resultCount, 0);
});

test("semantic search service handles embedding unavailable", async () => {
  await assert.rejects(
    () =>
      semanticSearch({
        body: { query: "risk" },
        dependencies: {
          queryEmbedder: async () => {
            throw createHttpError(503, "Embedding provider is not configured.", "EMBEDDING_NOT_CONFIGURED");
          },
        },
      }),
    {
      statusCode: 503,
      code: "SEARCH_EMBEDDING_UNAVAILABLE",
    },
  );
});

test("semantic search service handles vector search failure safely", async () => {
  await assert.rejects(
    () =>
      semanticSearch({
        body: { query: "risk" },
        dependencies: {
          queryEmbedder: async () => ({
            model: "gemini-embedding-2",
            dimensions: 768,
            embedding: fakeVector(),
          }),
          scopeResolver: async () => scopeResult(),
          vectorRepository: {
            executeVectorSearch: async () => {
              throw new Error("mongodb://SECRET_CONNECTION");
            },
          },
        },
      }),
    (error) => {
      assert.equal(error.code, "SEARCH_FAILED");
      assert.equal(JSON.stringify(error).includes("SECRET_CONNECTION"), false);
      return true;
    },
  );
});

test("semantic search service returns empty response when all-scope has no searchable documents", async () => {
  const response = await semanticSearch({
    body: { query: "risk" },
    dependencies: {
      queryEmbedder: async () => ({
        model: "gemini-embedding-2",
        dimensions: 768,
        embedding: fakeVector(),
      }),
      scopeResolver: async () => ({
        scope: "all",
        selectedDocumentIds: [],
        selectedFolderIds: [],
        resolvedDocumentIds: [],
        searchedDocumentCount: 0,
        documentsById: new Map(),
      }),
      vectorRepository: {
        executeVectorSearch: async () => {
          throw new Error("should not search empty scope");
        },
      },
    },
  });

  assert.equal(response.results.length, 0);
  assert.equal(response.warnings[0].code, "NO_SEARCHABLE_DOCUMENTS");
});

test("semantic search service rejects empty selected scope", async () => {
  await assert.rejects(
    () =>
      semanticSearch({
        body: { query: "risk", selectedDocumentIds: ["missing_doc"] },
        dependencies: {
          queryEmbedder: async () => ({
            model: "gemini-embedding-2",
            dimensions: 768,
            embedding: fakeVector(),
          }),
          scopeResolver: async () => ({
            scope: "all",
            selectedDocumentIds: ["missing_doc"],
            selectedFolderIds: [],
            resolvedDocumentIds: [],
            searchedDocumentCount: 0,
            documentsById: new Map(),
          }),
        },
      }),
    { code: "SEARCH_SCOPE_EMPTY" },
  );
});
