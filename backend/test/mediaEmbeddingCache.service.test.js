import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

const {
  buildDirectMediaChunkCacheQuery,
  buildDirectMediaChunkPayload,
  buildDocumentMediaMetaPatch,
  shouldSkipCachedMediaEmbedding,
  updateDocumentDirectMediaCache,
} = await import("../src/services/mediaEmbedding/mediaEmbeddingCache.service.js");

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

test("media embedding cache builds direct media query", () => {
  const documentId = new mongoose.Types.ObjectId();

  assert.deepEqual(buildDirectMediaChunkCacheQuery({ documentId }), {
    documentId,
    chunkKind: "media_direct",
    lifecycleStatus: "active",
  });
});

test("media embedding cache skips existing direct media chunk unless forced", async () => {
  const document = mockDocument();
  const cachedChunk = {
    id: "chunk_1",
    documentId: document._id,
    chunkKind: "media_direct",
  };
  const repository = {
    findDirectMediaChunkForDocument: async () => cachedChunk,
  };

  assert.deepEqual(await shouldSkipCachedMediaEmbedding({ document, repository }), {
    skip: true,
    cachedChunk,
  });
  assert.deepEqual(await shouldSkipCachedMediaEmbedding({ document, repository, force: true }), {
    skip: false,
    cachedChunk: null,
  });
});

test("media embedding cache builds safe direct media chunk payload", () => {
  const document = mockDocument();
  const payload = buildDirectMediaChunkPayload({
    document,
    mediaEmbeddingResult: {
      embedding: fakeVector(0.2),
      model: "gemini-embedding-2",
      dimensions: 768,
      inputType: "image",
      mimeType: "image/png",
    },
    asset: {
      localPath: "D:\\private\\asset.png",
      filename: "workflow.png",
      mimeType: "image/png",
    },
    embeddedAt: new Date("2026-06-09T00:00:00.000Z"),
  });

  assert.equal(String(payload.documentId), String(document._id));
  assert.equal(payload.scope, "mock");
  assert.equal(payload.chunkIndex, 100000);
  assert.equal(payload.chunkKind, "media_direct");
  assert.equal(payload.embeddingInputType, "image");
  assert.equal(payload.embeddingModel, "gemini-embedding-2");
  assert.equal(payload.embeddingDimensions, 768);
  assert.equal(payload.tokenEstimate, 0);
  assert.equal(payload.mediaMeta.directMultimodal, true);
  assert.equal(payload.mediaMeta.sourceMimeType, "image/png");
  assert.equal(payload.mediaMeta.sourceFilename, "workflow.png");
  assert.equal(JSON.stringify(payload).includes("private"), false);
  assert.equal(JSON.stringify(payload).includes("localPath"), false);
});

test("media embedding cache builds and stores document mediaMeta patch", async () => {
  const document = mockDocument();
  const chunk = { _id: new mongoose.Types.ObjectId() };
  const embeddedAt = new Date("2026-06-09T01:00:00.000Z");
  const patch = buildDocumentMediaMetaPatch({
    currentMediaMeta: document.mediaMeta,
    chunk,
    mediaEmbeddingResult: {
      model: "gemini-embedding-2",
      dimensions: 768,
    },
    embeddedAt,
  });

  assert.equal(patch.directMultimodalEmbeddingSeeded, true);
  assert.equal(patch.directMultimodalEmbeddedAt, embeddedAt);
  assert.equal(String(patch.directMultimodalChunkId), String(chunk._id));
  assert.equal(patch.directMultimodalEmbeddingModel, "gemini-embedding-2");
  assert.equal(patch.directMultimodalEmbeddingDimensions, 768);

  const calls = [];
  await updateDocumentDirectMediaCache({
    document,
    chunk,
    mediaEmbeddingResult: { model: "gemini-embedding-2", dimensions: 768 },
    repository: {
      updateDocumentMediaMeta: async (call) => {
        calls.push(call);
        return call;
      },
    },
    embeddedAt,
  });

  assert.equal(calls.length, 1);
  assert.equal(String(calls[0].documentId), String(document._id));
  assert.equal(calls[0].mediaMeta.directMultimodalEmbeddingSeeded, true);
});
