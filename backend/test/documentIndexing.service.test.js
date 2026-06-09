import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

const { indexDocumentFromExtraction } = await import(
  "../src/services/indexing/documentIndexing.service.js"
);
const { createHttpError } = await import("../src/utils/httpError.js");

function fakeVector(value = 0.4) {
  return Array.from({ length: 768 }, () => value);
}

function document(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    demoSessionId: "demo_123",
    folderId: new mongoose.Types.ObjectId(),
    scope: "user",
    sourceType: "upload",
    title: "Indexing Brief",
    fileKind: "markdown",
    status: "uploaded",
    lifecycleStatus: "active",
    ...overrides,
  };
}

function extractionResult() {
  return {
    title: "Indexing Brief",
    fileKind: "markdown",
    extractedText: "## Intro\nCentralDocs indexing.",
    optimizedText: "## Intro\nCentralDocs indexing.",
    sourceBlocks: [
      {
        blockIndex: 0,
        blockType: "section",
        text: "CentralDocs indexing.",
        locator: { sectionTitle: "Intro" },
        metadata: {},
      },
    ],
    warnings: [{ code: "EXTRACTION_NOTE", message: "note" }],
    stats: {
      extractedCharCount: 29,
      optimizedCharCount: 29,
      estimatedTokenCount: 8,
      sourceBlockCount: 1,
    },
  };
}

function repositories({ existingChunks = 0 } = {}) {
  const statusPatches = [];
  const storedChunks = [];
  return {
    statusPatches,
    storedChunks,
    documentRepository: {
      updateDocumentIndexingStatus: async ({ patch }) => {
        statusPatches.push(patch);
        return patch;
      },
    },
    chunkRepository: {
      countChunksForDocument: async () => existingChunks,
      replaceChunksForDocument: async ({ chunks }) => {
        storedChunks.push(...chunks);
        return { insertedCount: chunks.length, chunks };
      },
    },
  };
}

async function fakeEmbedder({ text }) {
  return {
    model: "gemini-embedding-2",
    dimensions: 768,
    embedding: fakeVector(),
    provider: "gemini",
    keySlot: 0,
    warnings: [{ code: "FAKE_WARNING", message: `embedded ${text.length}` }],
  };
}

test("document indexing service indexes extraction result with fake dependencies", async () => {
  const doc = document();
  const extraction = extractionResult();
  const original = structuredClone(extraction);
  const repo = repositories();
  const result = await indexDocumentFromExtraction({
    document: doc,
    extractionResult: extraction,
    embedder: fakeEmbedder,
    repositories: repo,
  });

  assert.deepEqual(extraction, original);
  assert.deepEqual(result.statusSequence, [
    "extracting",
    "optimizing",
    "chunking",
    "embedding",
    "ready",
  ]);
  assert.equal(repo.storedChunks.length, result.chunkCount);
  assert.equal(repo.storedChunks[0].embeddingModel, "gemini-embedding-2");
  assert.equal(repo.storedChunks[0].embeddingDimensions, 768);
  assert.equal(repo.storedChunks[0].sourceLocator.sectionTitle, "Intro");
  assert.equal(result.contentStats.chunkCount, result.chunkCount);
  assert.equal(result.warnings.some((warning) => warning.code === "EXTRACTION_NOTE"), true);
  assert.equal("embedding" in result, false);
  assert.equal(JSON.stringify(result).includes("[0.4"), false);
});

test("document indexing service rejects trashed documents", async () => {
  await assert.rejects(
    () =>
      indexDocumentFromExtraction({
        document: document({ lifecycleStatus: "trashed" }),
        extractionResult: extractionResult(),
        embedder: fakeEmbedder,
        repositories: repositories(),
      }),
    { code: "DOCUMENT_TRASHED" },
  );
});

test("document indexing service marks failed on embedding exhaustion", async () => {
  const repo = repositories();

  await assert.rejects(
    () =>
      indexDocumentFromExtraction({
        document: document(),
        extractionResult: extractionResult(),
        embedder: async () => {
          throw createHttpError(
            429,
            "All embedding key slots are rate limited.",
            "AI_RATE_LIMIT_EXHAUSTED",
          );
        },
        repositories: repo,
      }),
    { code: "AI_RATE_LIMIT_EXHAUSTED" },
  );

  assert.equal(repo.statusPatches.at(-1).status, "failed");
  assert.equal(JSON.stringify(repo.statusPatches).includes("key slots"), true);
});

test("document indexing service does not replace existing chunks unless reindexing", async () => {
  await assert.rejects(
    () =>
      indexDocumentFromExtraction({
        document: document(),
        extractionResult: extractionResult(),
        embedder: fakeEmbedder,
        repositories: repositories({ existingChunks: 2 }),
      }),
    { code: "DOCUMENT_NOT_INDEXABLE" },
  );
});
