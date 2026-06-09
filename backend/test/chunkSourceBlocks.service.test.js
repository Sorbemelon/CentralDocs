import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const { createChunkDraftsFromSourceBlocks } = await import(
  "../src/services/chunking/chunkSourceBlocks.service.js"
);

function block(blockIndex, text, locator = {}, blockType = "paragraph") {
  return {
    blockIndex,
    blockType,
    text,
    locator,
    metadata: {},
  };
}

test("source-block chunking merges small blocks and preserves pageNumber", () => {
  const result = createChunkDraftsFromSourceBlocks(
    [
      block(0, "Page one heading", { pageNumber: 1 }),
      block(1, "Page one paragraph", { pageNumber: 1 }),
    ],
    { documentId: "doc_1", fileKind: "pdf", scope: "user", maxTokens: 900 },
  );

  assert.equal(result.chunks.length, 1);
  assert.equal(result.chunks[0].sourceLocator.pageNumber, 1);
  assert.deepEqual(
    result.chunks[0].sourceBlockRefs.map((ref) => ref.blockIndex),
    [0, 1],
  );
});

test("source-block chunking splits long blocks", () => {
  const longText = Array.from({ length: 500 }, (_, index) => `word${index}`).join(" ");
  const result = createChunkDraftsFromSourceBlocks(
    [block(0, longText, { sectionTitle: "Long" })],
    { documentId: "doc_1", fileKind: "markdown", scope: "user", maxTokens: 80 },
  );

  assert.ok(result.chunks.length > 1);
  assert.ok(result.chunks.every((chunk) => chunk.tokenEstimate <= 80));
});

test("source-block chunking preserves slideNumber", () => {
  const result = createChunkDraftsFromSourceBlocks(
    [block(0, "Slide rollout risks", { slideNumber: 3 })],
    { documentId: "doc_1", fileKind: "pptx", scope: "mock" },
  );

  assert.equal(result.chunks[0].sourceLocator.slideNumber, 3);
});

test("source-block chunking preserves sheetName and row ranges", () => {
  const result = createChunkDraftsFromSourceBlocks(
    [
      block(0, "Headers", { sheetName: "Invoices", rowStart: 1, rowEnd: 1 }, "sheet_header"),
      block(1, "Row 2", { sheetName: "Invoices", rowStart: 2, rowEnd: 2 }, "sheet_row"),
      block(2, "Row 3", { sheetName: "Invoices", rowStart: 3, rowEnd: 3 }, "sheet_row"),
    ],
    { documentId: "doc_1", fileKind: "xlsx", scope: "mock" },
  );

  assert.equal(result.chunks[0].sourceLocator.sheetName, "Invoices");
  assert.equal(result.chunks[0].sourceLocator.rowStart, 1);
  assert.equal(result.chunks[0].sourceLocator.rowEnd, 3);
});

test("source-block chunking preserves media timestamps", () => {
  const result = createChunkDraftsFromSourceBlocks(
    [
      block(0, "Opening risk", { mediaTimestampStart: 10 }, "media_transcript"),
      block(1, "Later risk", { mediaTimestampStart: 25 }, "media_transcript"),
    ],
    { documentId: "doc_1", fileKind: "audio", scope: "mock" },
  );

  assert.equal(result.chunks[0].sourceLocator.mediaTimestampStart, 10);
  assert.equal(result.chunks[0].sourceLocator.mediaTimestampEnd, 25);
});

test("source-block chunking warns on mixed page locators and ignores empty blocks", () => {
  const result = createChunkDraftsFromSourceBlocks(
    [
      block(0, "", { pageNumber: 1 }),
      block(1, "Page one", { pageNumber: 1 }),
      block(2, "Page two", { pageNumber: 2 }),
    ],
    { documentId: "doc_1", fileKind: "pdf", scope: "user" },
  );

  assert.equal(result.chunks.length, 1);
  assert.equal(result.chunks[0].sourceBlockRefs.length, 2);
  assert.equal(result.chunks[0].sourceLocator.pageNumber, 1);
  assert.equal(result.chunks[0].chunkMeta.warnings[0].code, "MIXED_PAGE_LOCATORS");
});
