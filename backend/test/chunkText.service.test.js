import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const { createChunkDraftsFromText } = await import(
  "../src/services/chunking/chunkText.service.js"
);

function paragraph(label, wordCount = 80) {
  return `${label} ${Array.from({ length: wordCount }, (_, index) => `word${index}`).join(" ")}`;
}

test("raw text chunking splits long text into multiple chunks with overlap", () => {
  const text = [paragraph("alpha"), paragraph("beta"), paragraph("gamma")].join("\n\n");
  const result = createChunkDraftsFromText(text, {
    documentId: "doc_1",
    sourceDocumentTitle: "Long Text",
    fileKind: "markdown",
    scope: "user",
    maxTokens: 90,
    overlapTokens: 10,
  });

  assert.ok(result.chunks.length > 1);
  assert.equal(result.chunks[0].chunkIndex, 0);
  assert.equal(result.chunks[1].chunkMeta.overlapTokens, 10);
  assert.ok(result.chunks.every((chunk) => chunk.tokenEstimate <= 90));
});

test("raw text chunking does not create empty chunks", () => {
  const result = createChunkDraftsFromText("\n\n   \nUseful paragraph\n\n", {
    documentId: "doc_1",
    maxTokens: 90,
  });

  assert.equal(result.chunks.length, 1);
  assert.match(result.chunks[0].content, /Useful paragraph/);
});

test("raw text chunking preserves content order", () => {
  const result = createChunkDraftsFromText("First section\n\nSecond section\n\nThird section", {
    documentId: "doc_1",
    maxTokens: 20,
    overlapTokens: 0,
  });
  const joined = result.chunks.map((chunk) => chunk.content).join("\n");

  assert.ok(joined.indexOf("First section") < joined.indexOf("Second section"));
  assert.ok(joined.indexOf("Second section") < joined.indexOf("Third section"));
});

test("raw text chunking truncates after max chunk count", () => {
  const text = Array.from({ length: 30 }, (_, index) => paragraph(`section${index}`, 30)).join("\n\n");
  const result = createChunkDraftsFromText(text, {
    documentId: "doc_1",
    scope: "generated",
    maxTokens: 25,
  });

  assert.equal(result.truncated, true);
  assert.equal(result.chunks.length, 8);
  assert.equal(result.warnings[0].code, "CHUNK_COUNT_TRUNCATED");
});
