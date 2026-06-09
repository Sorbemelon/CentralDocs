import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const {
  embedChunkDrafts,
  embedExtractionResult,
  embedMockDocumentChunks,
} = await import("../src/services/embedding/embeddingPipeline.service.js");
const { createHttpError } = await import("../src/utils/httpError.js");

function fakeVector(value = 0.6) {
  return Array.from({ length: 768 }, () => value);
}

function chunk(index, content = `Chunk ${index}`) {
  return {
    documentId: "doc_1",
    sourceDocumentTitle: "Policy",
    fileKind: "markdown",
    scope: "user",
    chunkIndex: index,
    content,
    contentPreview: content,
    tokenEstimate: 4,
    sourceLocator: { sectionTitle: "Intro" },
    sourceBlockRefs: [{ blockIndex: index, blockType: "section" }],
    chunkMeta: {
      strategy: "source_blocks",
      overlapTokens: 0,
      truncated: false,
      warnings: [],
      createdFromExtraction: true,
    },
  };
}

function fakeEmbedderFactory(calls) {
  return async ({ text }) => {
    calls.push(text);
    return {
      model: "gemini-embedding-2",
      dimensions: 768,
      embedding: fakeVector(),
      provider: "gemini",
      keySlot: 0,
      warnings: [],
    };
  };
}

test("embedding pipeline embeds multiple chunk drafts sequentially", async () => {
  const calls = [];
  const result = await embedChunkDrafts({
    chunks: [chunk(0, "First"), chunk(1, "Second")],
    embedder: fakeEmbedderFactory(calls),
  });

  assert.deepEqual(calls, ["First", "Second"]);
  assert.equal(result.chunks.length, 2);
  assert.equal(result.stats.chunkCount, 2);
  assert.equal(result.stats.embeddedCount, 2);
  assert.equal(result.stats.failedCount, 0);
  assert.equal(result.stats.embeddingModel, "gemini-embedding-2");
  assert.equal(result.stats.embeddingDimensions, 768);
  assert.equal(result.stats.provider, "gemini");
  assert.equal(result.stats.fallbackUsed, false);
  assert.equal(result.aiRouting[0].actionType, "embedding");
  assert.equal(result.aiRouting[0].status, "success");
});

test("embedding pipeline can continue after one failed chunk", async () => {
  const result = await embedChunkDrafts({
    chunks: [chunk(0, "First"), chunk(1, "Second")],
    options: { continueOnError: true },
    embedder: async ({ text }) => {
      if (text === "Second") {
        throw new Error("provider failed");
      }
      return {
        model: "gemini-embedding-2",
        dimensions: 768,
        embedding: fakeVector(),
        provider: "gemini",
        warnings: [],
      };
    },
  });

  assert.equal(result.chunks.length, 1);
  assert.equal(result.stats.failedCount, 1);
  assert.equal(result.warnings[0].code, "CHUNK_EMBEDDING_FAILED");
  assert.equal(result.aiRouting.some((attempt) => attempt.status === "failed"), true);
});

test("embedding pipeline stops on exhausted rate limits", async () => {
  await assert.rejects(
    () =>
      embedChunkDrafts({
        chunks: [chunk(0, "First")],
        embedder: async () => {
          throw createHttpError(
            429,
            "All embedding key slots are rate limited.",
            "AI_RATE_LIMIT_EXHAUSTED",
          );
        },
      }),
    {
      statusCode: 429,
      code: "AI_RATE_LIMIT_EXHAUSTED",
    },
  );
});

test("embedding pipeline embeds extraction result through chunking pipeline", async () => {
  const calls = [];
  const result = await embedExtractionResult({
    extractionResult: {
      title: "Brief",
      fileKind: "markdown",
      optimizedText: "Brief text",
      sourceBlocks: [
        {
          blockIndex: 0,
          blockType: "section",
          text: "Brief text",
          locator: { sectionTitle: "Brief" },
          metadata: {},
        },
      ],
      warnings: [{ code: "EXTRACTION_NOTE", message: "note" }],
      stats: { sourceBlockCount: 1 },
    },
    options: { documentId: "doc_1", scope: "user" },
    embedder: fakeEmbedderFactory(calls),
  });

  assert.equal(calls.length, 1);
  assert.equal(result.chunks.length, 1);
  assert.equal(result.warnings[0].code, "EXTRACTION_NOTE");
});

test("embedding pipeline embeds mock markdown document with fake embedder", async () => {
  const calls = [];
  const result = await embedMockDocumentChunks({
    slug: "01-strategy-rollout/centraldocs-transformation-brief.md",
    embedder: fakeEmbedderFactory(calls),
  });

  assert.ok(calls.length >= 1);
  assert.ok(result.chunks.length >= 1);
  assert.equal(result.chunks[0].scope, "mock");
});

test("embedding pipeline embeds mock media sidecar text without multimodal input", async () => {
  const calls = [];
  const result = await embedMockDocumentChunks({
    slug: "05-meeting-evidence/rollout-risk-discussion.mp3",
    embedder: async ({ text }) => {
      calls.push(text);
      assert.equal(typeof text, "string");
      return {
        model: "gemini-embedding-2",
        dimensions: 768,
        embedding: fakeVector(),
        provider: "gemini",
        warnings: [],
      };
    },
  });

  assert.ok(calls.length >= 1);
  assert.ok(result.chunks.length >= 1);
  assert.equal(result.chunks[0].fileKind, "audio");
});
