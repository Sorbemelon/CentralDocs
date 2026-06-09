import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const {
  createChunkDraft,
  reindexChunkDrafts,
} = await import("../src/services/chunking/chunkDraft.dto.js");

test("chunk draft DTO returns safe public shape and capped preview", () => {
  const draft = createChunkDraft({
    documentId: "doc_1",
    sourceDocumentTitle: "Policy",
    fileKind: "pdf",
    scope: "user",
    chunkIndex: 0,
    content: "A".repeat(800),
    sourceLocator: {
      pageNumber: 1,
      localPath: "D:/private/file.pdf",
    },
    sourceBlockRefs: [{ blockIndex: 2, blockType: "page", localPath: "D:/private/file.pdf" }],
    chunkMeta: {
      strategy: "source_blocks",
      overlapTokens: 0,
    },
  });

  assert.equal(draft.contentPreview.length, 500);
  assert.equal("localPath" in draft.sourceLocator, false);
  assert.equal("localPath" in draft.sourceBlockRefs[0], false);
  assert.deepEqual(Object.keys(draft.sourceLocator), ["pageNumber"]);
});

test("chunk draft DTO locator shape matches chunk model locator fields", () => {
  const draft = createChunkDraft({
    content: "Located content",
    sourceLocator: {
      pageNumber: 2,
      slideNumber: 3,
      sheetName: "Invoices",
      rowStart: 4,
      rowEnd: 5,
      sectionTitle: "Risks",
      mediaTimestampStart: 10,
      mediaTimestampEnd: 20,
    },
  });

  assert.deepEqual(Object.keys(draft.sourceLocator), [
    "pageNumber",
    "slideNumber",
    "sheetName",
    "rowStart",
    "rowEnd",
    "sectionTitle",
    "mediaTimestampStart",
    "mediaTimestampEnd",
  ]);
});

test("chunk draft DTO reindexes chunks from zero", () => {
  const chunks = reindexChunkDrafts([
    createChunkDraft({ chunkIndex: 99, content: "First" }),
    createChunkDraft({ chunkIndex: 99, content: "Second" }),
  ]);

  assert.equal(chunks[0].chunkIndex, 0);
  assert.equal(chunks[1].chunkIndex, 1);
});
