import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const { embedChunkDraft } = await import("../src/services/embedding/chunkEmbedding.service.js");

function fakeVector(value = 0.5) {
  return Array.from({ length: 768 }, () => value);
}

function chunkDraft(overrides = {}) {
  return {
    documentId: "doc_1",
    sourceDocumentTitle: "Policy",
    fileKind: "pdf",
    scope: "user",
    chunkIndex: 0,
    content: "Chunk content",
    contentPreview: "Chunk content",
    tokenEstimate: 3,
    sourceLocator: { pageNumber: 2 },
    sourceBlockRefs: [{ blockIndex: 4, blockType: "page" }],
    chunkMeta: {
      strategy: "source_blocks",
      overlapTokens: 0,
      truncated: false,
      warnings: [],
      createdFromExtraction: true,
    },
    ...overrides,
  };
}

test("chunk embedding embeds draft without mutating original", async () => {
  const original = chunkDraft();
  const snapshot = structuredClone(original);
  const embedded = await embedChunkDraft(original, {
    embedder: async ({ text, title }) => {
      assert.equal(text, "Chunk content");
      assert.equal(title, "Policy");
      return {
        model: "gemini-embedding-2",
        dimensions: 768,
        embedding: fakeVector(),
        provider: "gemini",
        keySlot: 1,
        warnings: [],
      };
    },
    embeddedAt: new Date("2026-06-09T00:00:00.000Z"),
  });

  assert.deepEqual(original, snapshot);
  assert.equal(embedded.embedding.length, 768);
  assert.equal(embedded.embeddingModel, "gemini-embedding-2");
  assert.equal(embedded.embeddingDimensions, 768);
  assert.equal(embedded.embeddingMeta.provider, "gemini");
  assert.equal(embedded.embeddingMeta.keySlot, 1);
  assert.equal(embedded.embeddingMeta.embeddedAt, "2026-06-09T00:00:00.000Z");
});

test("chunk embedding preserves locator, block refs, and chunk metadata", async () => {
  const embedded = await embedChunkDraft(chunkDraft(), {
    embedder: async () => ({
      model: "gemini-embedding-2",
      dimensions: 768,
      embedding: fakeVector(),
      provider: "gemini",
      warnings: [],
    }),
  });

  assert.deepEqual(embedded.sourceLocator, { pageNumber: 2 });
  assert.deepEqual(embedded.sourceBlockRefs, [{ blockIndex: 4, blockType: "page" }]);
  assert.equal(embedded.chunkMeta.strategy, "source_blocks");
});

test("chunk embedding rejects empty content", async () => {
  await assert.rejects(() => embedChunkDraft(chunkDraft({ content: " " })), {
    statusCode: 400,
    code: "EMBEDDING_INPUT_EMPTY",
  });
});
