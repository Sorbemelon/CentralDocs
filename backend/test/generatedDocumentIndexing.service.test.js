import { test } from "node:test";
import assert from "node:assert/strict";

const {
  buildGeneratedDocumentExtractionResult,
  indexGeneratedDocument,
} = await import("../src/services/generatedDocuments/generatedDocumentIndexing.service.js");

const document = {
  _id: "doc_1",
  title: "Generated Brief",
  originalFilename: "brief.md",
  downloadFilename: "brief.md",
  fileKind: "markdown",
};

test("generated document indexing builds synthetic extraction result from Markdown content", () => {
  const extraction = buildGeneratedDocumentExtractionResult({
    document,
    content: "# Brief\n\nKey findings.",
  });

  assert.equal(extraction.title, "Generated Brief");
  assert.equal(extraction.fileKind, "markdown");
  assert.equal(extraction.optimizedText.includes("Key findings"), true);
  assert.equal(extraction.sourceBlocks[0].blockType, "generated_document");
});

test("generated document indexing calls fake document indexer", async () => {
  let captured = null;
  const result = await indexGeneratedDocument({
    document,
    content: "# Brief",
    indexer: async (input) => {
      captured = input;
      return {
        contentStats: { chunkCount: 1, extractedCharCount: 7 },
        warnings: [],
      };
    },
  });

  assert.equal(result.indexed, true);
  assert.equal(captured.document._id, "doc_1");
  assert.equal(captured.extractionResult.sourceBlocks.length, 1);
  assert.equal(result.contentStats.chunkCount, 1);
});

test("generated document indexing failure returns warning and keeps saved document path viable", async () => {
  const result = await indexGeneratedDocument({
    document,
    content: "# Brief",
    indexer: async () => {
      const error = new Error("provider unavailable");
      error.code = "EMBEDDING_NOT_CONFIGURED";
      throw error;
    },
  });

  assert.equal(result.indexed, false);
  assert.equal(result.warnings[0].code, "GENERATED_DOCUMENT_INDEXING_FAILED");
  assert.equal(result.warnings[0].reason, "EMBEDDING_NOT_CONFIGURED");
});
