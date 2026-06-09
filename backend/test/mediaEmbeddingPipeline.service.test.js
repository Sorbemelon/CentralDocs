import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import path from "node:path";

const { embedMediaDocument } = await import("../src/services/mediaEmbedding/mediaEmbeddingPipeline.service.js");
const { createMemoryDocumentChunkRepository } = await import("../src/services/indexing/documentChunk.repository.js");
const { getMockDocumentsRoot } = await import("../src/services/mockData/mockAsset.service.js");

function fakeVector(value = 0.1) {
  return Array.from({ length: 768 }, () => value);
}

function mockDocument(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    folderId: new mongoose.Types.ObjectId(),
    scope: "mock",
    sourceType: "mock",
    readOnly: true,
    lifecycleStatus: "active",
    fileKind: "image",
    title: "Workflow Diagram",
    originalFilename: "workflow.png",
    mimeType: "image/png",
    mediaMeta: {
      directMultimodalEmbeddingSeeded: false,
    },
    ...overrides,
  };
}

function mockAsset(overrides = {}) {
  return {
    localPath: path.join(getMockDocumentsRoot(), "01-strategy-rollout/intake-to-ai-search-workflow.png"),
    filename: "workflow.png",
    mimeType: "image/png",
    ...overrides,
  };
}

function documentRepository() {
  const calls = [];
  return {
    calls,
    async updateDocumentMediaMeta(call) {
      calls.push(call);
      return call;
    },
  };
}

test("media embedding pipeline dry-run validates mock media without embedding call", async () => {
  let embedderCalled = false;
  const result = await embedMediaDocument({
    document: mockDocument(),
    asset: mockAsset(),
    dryRun: true,
    embedder: async () => {
      embedderCalled = true;
    },
  });

  assert.equal(embedderCalled, false);
  assert.equal(result.status, "planned");
  assert.equal(result.dryRun, true);
  assert.equal(result.inputType, "image");
});

test("media embedding pipeline embeds image, audio, and video with fake embedder", async () => {
  const cases = [
    ["image", "image/png", "image"],
    ["audio", "audio/mpeg", "audio"],
    ["video", "video/mp4", "video"],
  ];

  for (const [fileKind, mimeType, inputType] of cases) {
    const chunkRepository = createMemoryDocumentChunkRepository();
    const docRepository = documentRepository();
    const document = mockDocument({ fileKind, mimeType });
    const result = await embedMediaDocument({
      document,
      asset: mockAsset({ mimeType, filename: `media.${inputType}` }),
      embedder: async () => ({
        model: "gemini-embedding-2",
        dimensions: 768,
        embedding: fakeVector(0.2),
        provider: "gemini",
        keySlot: 1,
        inputType,
        mimeType,
        warnings: [],
      }),
      repositories: {
        chunkRepository,
        documentRepository: docRepository,
      },
      embeddedAt: new Date("2026-06-09T00:00:00.000Z"),
    });

    const chunks = await chunkRepository.listChunksForDocument({ documentId: document._id });

    assert.equal(result.status, "completed");
    assert.equal(result.cached, false);
    assert.equal(result.inputType, inputType);
    assert.equal(result.embeddingModel, "gemini-embedding-2");
    assert.equal(result.embeddingDimensions, 768);
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].chunkKind, "media_direct");
    assert.equal(chunks[0].embeddingInputType, inputType);
    assert.equal(docRepository.calls.length, 1);
  }
});

test("media embedding pipeline preserves sidecar text chunks", async () => {
  const document = mockDocument({ fileKind: "video", mimeType: "video/mp4" });
  const chunkRepository = createMemoryDocumentChunkRepository();
  await chunkRepository.insertChunksForDocument({
    chunks: [{
      documentId: document._id,
      chunkIndex: 0,
      chunkKind: "text",
      content: "Sidecar notes remain indexed.",
      lifecycleStatus: "active",
    }],
  });

  await embedMediaDocument({
    document,
    asset: mockAsset({ mimeType: "video/mp4" }),
    embedder: async () => ({
      model: "gemini-embedding-2",
      dimensions: 768,
      embedding: fakeVector(0.3),
      provider: "gemini",
      inputType: "video",
      mimeType: "video/mp4",
    }),
    repositories: {
      chunkRepository,
      documentRepository: documentRepository(),
    },
  });

  const chunks = await chunkRepository.listChunksForDocument({ documentId: document._id });
  assert.equal(chunks.length, 2);
  assert.equal(chunks.some((chunk) => chunk.chunkKind === "text"), true);
  assert.equal(chunks.some((chunk) => chunk.chunkKind === "media_direct"), true);
});

test("media embedding pipeline returns skipped_cached for existing direct media embedding", async () => {
  const document = mockDocument();
  const cachedChunk = {
    id: "cached_chunk",
    documentId: document._id,
    chunkKind: "media_direct",
    mediaMeta: {
      seededAt: "2026-06-08T00:00:00.000Z",
    },
  };
  const result = await embedMediaDocument({
    document,
    asset: mockAsset(),
    embedder: async () => {
      throw new Error("should not call fake embedder");
    },
    repositories: {
      chunkRepository: {
        findDirectMediaChunkForDocument: async () => cachedChunk,
      },
      documentRepository: documentRepository(),
    },
  });

  assert.equal(result.status, "skipped_cached");
  assert.equal(result.cached, true);
  assert.equal(result.chunkId, "cached_chunk");
});

test("media embedding pipeline force re-embeds when cache exists", async () => {
  const document = mockDocument();
  const chunkRepository = createMemoryDocumentChunkRepository();
  await chunkRepository.insertChunksForDocument({
    chunks: [{
      documentId: document._id,
      chunkKind: "media_direct",
      chunkIndex: 100000,
      content: "old",
    }],
  });

  const result = await embedMediaDocument({
    document,
    asset: mockAsset(),
    force: true,
    embedder: async () => ({
      model: "gemini-embedding-2",
      dimensions: 768,
      embedding: fakeVector(0.4),
      provider: "gemini",
      inputType: "image",
      mimeType: "image/png",
    }),
    repositories: {
      chunkRepository,
      documentRepository: documentRepository(),
    },
  });

  assert.equal(result.status, "completed");
  assert.equal(await chunkRepository.countDirectMediaChunksForDocument({ documentId: document._id }), 2);
});

test("media embedding pipeline returns safe DTO without full vector", async () => {
  const result = await embedMediaDocument({
    document: mockDocument(),
    asset: mockAsset(),
    embedder: async () => ({
      model: "gemini-embedding-2",
      dimensions: 768,
      embedding: fakeVector(0.5),
      provider: "gemini",
      inputType: "image",
      mimeType: "image/png",
    }),
    repositories: {
      chunkRepository: createMemoryDocumentChunkRepository(),
      documentRepository: documentRepository(),
    },
  });

  assert.equal("embedding" in result, false);
  assert.equal(JSON.stringify(result).includes("[0."), false);
});

test("media embedding pipeline rejects non-media and non-mock documents", async () => {
  await assert.rejects(
    () => embedMediaDocument({ document: mockDocument({ fileKind: "pdf" }), asset: mockAsset() }),
    { code: "MEDIA_EMBEDDING_UNSUPPORTED" },
  );
  await assert.rejects(
    () => embedMediaDocument({ document: mockDocument({ scope: "user" }), asset: mockAsset() }),
    { code: "MEDIA_EMBEDDING_MOCK_ONLY" },
  );
});

test("media embedding pipeline handles provider exhaustion safely", async () => {
  await assert.rejects(
    () =>
      embedMediaDocument({
        document: mockDocument(),
        asset: mockAsset(),
        embedder: async () => {
          const error = new Error("all slots exhausted");
          error.code = "AI_RATE_LIMIT_EXHAUSTED";
          error.statusCode = 429;
          throw error;
        },
      }),
    {
      statusCode: 429,
      code: "AI_RATE_LIMIT_EXHAUSTED",
    },
  );
});
