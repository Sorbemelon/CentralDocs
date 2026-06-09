import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";
delete process.env.GEMINI_API_KEY_1;
delete process.env.GEMINI_API_KEY_2;
delete process.env.GEMINI_API_KEY_3;
delete process.env.GEMINI_API_KEYS;
delete process.env.MONGODB_URI;

const { app } = await import("../src/app.js");
const {
  resetSemanticSearchDependenciesForTests,
  setSemanticSearchDependenciesForTests,
} = await import("../src/services/search/semanticSearch.service.js");

function fakeVector(value = 0.1) {
  return Array.from({ length: 768 }, () => value);
}

afterEach(() => {
  resetSemanticSearchDependenciesForTests();
});

test("POST /api/search/semantic returns search response with fake dependencies", async () => {
  setSemanticSearchDependenciesForTests({
    queryEmbedder: async () => ({
      model: "gemini-embedding-2",
      dimensions: 768,
      embedding: fakeVector(),
    }),
    scopeResolver: async ({ request, demoSessionId }) => ({
      scope: request.scope,
      selectedDocumentIds: request.selectedDocumentIds,
      selectedFolderIds: request.selectedFolderIds,
      resolvedDocumentIds: ["doc_1"],
      allowedScopes: ["mock"],
      demoSessionId,
      searchedDocumentCount: 1,
      documentsById: new Map([
        ["doc_1", { id: "doc_1", title: "Customer Feedback", fileKind: "csv", folderName: "Support" }],
      ]),
    }),
    vectorRepository: {
      executeVectorSearch: async () => [{
        chunkId: "chunk_1",
        documentId: "doc_1",
        chunkIndex: 0,
        content: "Customers mention document search delays.",
        contentPreview: "Customers mention document search delays.",
        score: 0.9,
        sourceLocator: { rowStart: 4, rowEnd: 4 },
        chunkKind: "text",
        embeddingInputType: "text",
        scope: "mock",
      }],
    },
  });

  const response = await request(app)
    .post("/api/search/semantic")
    .set("x-demo-session-id", "demo_123")
    .send({ query: "customer document search", topK: 6 })
    .expect(200);

  assert.equal(response.body.query, "customer document search");
  assert.equal(response.body.results.length, 1);
  assert.equal(response.body.references[0].citationNumber, 1);
  assert.equal(response.body.stats.embeddingModel, "gemini-embedding-2");
  assert.equal(response.body.stats.embeddingDimensions, 768);
  assert.equal("answer" in response.body, false);
  assert.equal(JSON.stringify(response.body).includes("[0."), false);
});

test("POST /api/search/semantic returns JSON errors for invalid query", async () => {
  const emptyResponse = await request(app)
    .post("/api/search/semantic")
    .send({ query: "   " })
    .expect(400);
  const longResponse = await request(app)
    .post("/api/search/semantic")
    .send({ query: "A".repeat(501) })
    .expect(400);

  assert.equal(emptyResponse.body.error.code, "SEARCH_QUERY_EMPTY");
  assert.equal(longResponse.body.error.code, "SEARCH_QUERY_TOO_LONG");
});

test("POST /api/search/semantic returns safe not-configured response without fake dependencies", async () => {
  const response = await request(app)
    .post("/api/search/semantic")
    .send({ query: "risk" })
    .expect(503);

  assert.equal(response.body.error.code, "SEARCH_EMBEDDING_UNAVAILABLE");
  assert.equal(JSON.stringify(response.body).includes("GEMINI_API_KEY"), false);
});

test("search route exists only as semantic POST and unrelated routes stay constrained", async () => {
  await request(app).get("/api/search/semantic").expect(404);
  await request(app).post("/api/documents/upload-batch").expect(404);
  await request(app)
    .get(["/api/chats/chat_1/generated", "documents"].join("-"))
    .set("x-demo-session-id", "demo_123")
    .expect(404);
});
