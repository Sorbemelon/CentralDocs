import { test } from "node:test";
import assert from "node:assert/strict";

const { toSemanticSearchResponseDto } = await import("../src/services/search/searchResult.dto.js");

test("search result DTO builds safe API response", () => {
  const response = toSemanticSearchResponseDto({
    request: {
      query: "customer document search pain",
      topK: 6,
    },
    scope: {
      scope: "all",
      selectedDocumentIds: [],
      selectedFolderIds: [],
      resolvedDocumentIds: ["doc_1"],
      searchedDocumentCount: 1,
      documentsById: new Map([
        ["doc_1", { id: "doc_1", title: "Customer Feedback", fileKind: "csv", folderName: "Support" }],
      ]),
    },
    matches: [{
      chunkId: "chunk_1",
      documentId: "doc_1",
      chunkIndex: 2,
      chunkKind: "text",
      embeddingInputType: "text",
      contentPreview: "Customers cannot find policies quickly.",
      score: 0.93,
      sourceLocator: { rowStart: 4, rowEnd: 4 },
      embedding: [0.1],
      objectKey: "mock/private/key",
    }],
    references: [{
      citationNumber: 1,
      documentId: "doc_1",
      documentTitle: "Customer Feedback",
      fileType: "csv",
      folderName: "Support",
      chunkId: "chunk_1",
      rowRange: "4",
      excerptPreview: "Customers cannot find policies quickly.",
      similarityScore: 0.93,
      usedFor: "semantic search match",
    }],
    embeddingResult: {
      model: "gemini-embedding-2",
      dimensions: 768,
      embedding: Array.from({ length: 768 }, () => 0.1),
    },
  });

  assert.equal(response.query, "customer document search pain");
  assert.equal(response.results.length, 1);
  assert.equal(response.results[0].referenceNumber, 1);
  assert.equal(response.references[0].citationNumber, 1);
  assert.equal(response.stats.resultCount, 1);
  assert.equal(response.stats.searchedDocumentCount, 1);
  assert.equal(response.stats.embeddingModel, "gemini-embedding-2");
  assert.equal(response.stats.embeddingDimensions, 768);
  assert.equal(JSON.stringify(response).includes("objectKey"), false);
  assert.equal(JSON.stringify(response).includes("[0."), false);
});
