import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const { createChunkDraftsFromExtraction } = await import(
  "../src/services/chunking/chunkingPipeline.service.js"
);

test("chunking pipeline uses sourceBlocks when available", () => {
  const result = createChunkDraftsFromExtraction(
    {
      title: "Policy",
      fileKind: "pdf",
      optimizedText: "Fallback text should not be first choice",
      sourceBlocks: [
        {
          blockIndex: 0,
          blockType: "page",
          text: "Source block text",
          locator: { pageNumber: 1 },
          metadata: {},
        },
      ],
      warnings: [],
      stats: { sourceBlockCount: 1 },
    },
    { documentId: "doc_1", scope: "user" },
  );

  assert.equal(result.chunks.length, 1);
  assert.equal(result.chunks[0].chunkMeta.strategy, "source_blocks");
  assert.match(result.chunks[0].content, /Source block text/);
  assert.equal(result.chunks[0].sourceLocator.pageNumber, 1);
});

test("chunking pipeline falls back to optimizedText", () => {
  const result = createChunkDraftsFromExtraction(
    {
      title: "Brief",
      fileKind: "markdown",
      optimizedText: "First paragraph\n\nSecond paragraph",
      sourceBlocks: [],
      warnings: [],
      stats: { sourceBlockCount: 0 },
    },
    { documentId: "doc_1", scope: "user" },
  );

  assert.equal(result.chunks.length, 1);
  assert.equal(result.chunks[0].chunkMeta.strategy, "raw_text");
  assert.match(result.chunks[0].content, /First paragraph/);
});

test("chunking pipeline carries extraction warnings and returns stats", () => {
  const result = createChunkDraftsFromExtraction(
    {
      title: "Brief",
      fileKind: "markdown",
      optimizedText: "Brief text",
      sourceBlocks: [],
      warnings: [{ code: "EXTRACTION_WARNING", message: "Extraction warning." }],
      stats: { sourceBlockCount: 0 },
    },
    { documentId: "doc_1", scope: "user" },
  );

  assert.equal(result.warnings[0].code, "EXTRACTION_WARNING");
  assert.equal(result.stats.chunkCount, 1);
  assert.equal(result.stats.estimatedTokenCount > 0, true);
  assert.equal(result.stats.maxChunkTokens > 0, true);
});

test("chunking pipeline returns warnings on truncation", () => {
  const sourceBlocks = Array.from({ length: 30 }, (_, index) => ({
    blockIndex: index,
    blockType: "paragraph",
    text: `Block ${index} ${"word ".repeat(120)}`,
    locator: { sectionTitle: `Section ${index}` },
    metadata: {},
  }));
  const result = createChunkDraftsFromExtraction(
    {
      title: "Long mock",
      fileKind: "markdown",
      optimizedText: sourceBlocks.map((block) => block.text).join("\n"),
      sourceBlocks,
      warnings: [],
      stats: { sourceBlockCount: sourceBlocks.length },
    },
    { documentId: "doc_1", scope: "generated", maxTokens: 100 },
  );

  assert.equal(result.stats.truncated, true);
  assert.equal(result.chunks.length, 8);
  assert.ok(result.warnings.some((warning) => warning.code === "CHUNK_COUNT_TRUNCATED"));
});

test("chunking pipeline rejects empty extraction text", () => {
  assert.throws(
    () =>
      createChunkDraftsFromExtraction({
        title: "Empty",
        fileKind: "markdown",
        optimizedText: "",
        sourceBlocks: [],
      }),
    {
      statusCode: 400,
      code: "EMPTY_EXTRACTION_TEXT",
    },
  );
});
