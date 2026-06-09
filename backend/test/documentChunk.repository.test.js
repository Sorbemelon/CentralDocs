import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

const {
  buildDocumentChunkPayload,
  createMemoryDocumentChunkRepository,
  getDocumentChunkVectorSearchMetadata,
} = await import("../src/services/indexing/documentChunk.repository.js");
const { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } = await import("../src/constants/embedding.constants.js");

function embeddedChunk(overrides = {}) {
  return {
    documentId: new mongoose.Types.ObjectId(),
    scope: "user",
    chunkIndex: 2,
    content: "CentralDocs indexing foundation text.",
    embedding: Array.from({ length: 768 }, () => 0.2),
    embeddingModel: EMBEDDING_MODEL,
    embeddingDimensions: EMBEDDING_DIMENSIONS,
    tokenEstimate: 9,
    sourceLocator: {
      pageNumber: 3,
      sectionTitle: "Indexing",
    },
    chunkMeta: {
      localPath: "D:\\private\\mock-file.md",
    },
    ...overrides,
  };
}

test("document chunk repository builds payload from embedded chunk", () => {
  const documentId = new mongoose.Types.ObjectId();
  const payload = buildDocumentChunkPayload({
    document: {
      _id: documentId,
      demoSessionId: "demo_123",
      folderId: new mongoose.Types.ObjectId(),
      scope: "user",
    },
    embeddedChunk: embeddedChunk({ documentId }),
  });

  assert.equal(String(payload.documentId), String(documentId));
  assert.equal(payload.demoSessionId, "demo_123");
  assert.equal(payload.scope, "user");
  assert.equal(payload.chunkIndex, 2);
  assert.equal(payload.embeddingModel, "gemini-embedding-2");
  assert.equal(payload.embeddingDimensions, 768);
  assert.equal(payload.lifecycleStatus, "active");
  assert.equal(payload.sourceLocator.pageNumber, 3);
  assert.equal(payload.sourceLocator.sectionTitle, "Indexing");
  assert.equal(JSON.stringify(payload).includes("private"), false);
  assert.equal(JSON.stringify(payload).includes("localPath"), false);
});

test("memory document chunk repository records replace operations", async () => {
  const repository = createMemoryDocumentChunkRepository();
  const documentId = new mongoose.Types.ObjectId();
  const chunks = [
    buildDocumentChunkPayload({
      document: { _id: documentId, scope: "mock" },
      embeddedChunk: embeddedChunk({ chunkIndex: 0 }),
    }),
    buildDocumentChunkPayload({
      document: { _id: documentId, scope: "mock" },
      embeddedChunk: embeddedChunk({ chunkIndex: 1 }),
    }),
  ];

  const result = await repository.replaceChunksForDocument({ documentId, chunks });
  const listed = await repository.listChunksForDocument({ documentId });

  assert.equal(result.insertedCount, 2);
  assert.equal(await repository.countChunksForDocument({ documentId }), 2);
  assert.equal(listed[0].chunkIndex, 0);
  assert.equal(repository.state.replaceCalls.length, 1);
});

test("document chunk repository builds direct media payload without local paths", () => {
  const documentId = new mongoose.Types.ObjectId();
  const payload = buildDocumentChunkPayload({
    document: {
      _id: documentId,
      demoSessionId: null,
      scope: "mock",
    },
    embeddedChunk: embeddedChunk({
      documentId,
      chunkIndex: 100000,
      content: "Direct image embedding: Workflow Diagram",
      tokenEstimate: 0,
      chunkKind: "media_direct",
      embeddingInputType: "image",
      mediaMeta: {
        directMultimodal: true,
        seededAt: new Date("2026-06-09T00:00:00.000Z"),
        sourceMimeType: "image/png",
        sourceFilename: "workflow.png",
        localPath: "D:\\private\\workflow.png",
      },
    }),
  });

  assert.equal(payload.chunkKind, "media_direct");
  assert.equal(payload.embeddingInputType, "image");
  assert.equal(payload.mediaMeta.directMultimodal, true);
  assert.equal(payload.mediaMeta.sourceMimeType, "image/png");
  assert.equal(JSON.stringify(payload).includes("localPath"), false);
  assert.equal(JSON.stringify(payload).includes("private"), false);
});

test("memory document chunk repository lists direct media chunks separately", async () => {
  const repository = createMemoryDocumentChunkRepository();
  const documentId = new mongoose.Types.ObjectId();
  await repository.insertChunksForDocument({
    chunks: [
      { documentId, chunkKind: "text", chunkIndex: 0, content: "Sidecar text." },
      { documentId, chunkKind: "media_direct", chunkIndex: 100000, content: "Direct media." },
    ],
  });

  const directChunk = await repository.findDirectMediaChunkForDocument({ documentId });

  assert.equal(directChunk.chunkKind, "media_direct");
  assert.equal(await repository.countDirectMediaChunksForDocument({ documentId }), 1);
});

test("document chunk repository exposes external vector search metadata", () => {
  assert.deepEqual(getDocumentChunkVectorSearchMetadata(), {
    managedByMongoose: false,
    indexName: "document_chunks_vector_index",
    vectorField: "embedding",
    dimensions: 768,
    model: "gemini-embedding-2",
  });
});
