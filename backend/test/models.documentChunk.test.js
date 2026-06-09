import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

const { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } = await import("../src/constants/ai.constants.js");
const { DOCUMENT_SCOPE } = await import("../src/constants/document.constants.js");
const { LIFECYCLE_STATUS } = await import("../src/constants/lifecycle.constants.js");
const { DocumentChunk } = await import("../src/models/DocumentChunk.model.js");

function hasIndex(schema, expectedFields) {
  return schema.indexes().some(([fields]) => JSON.stringify(fields) === JSON.stringify(expectedFields));
}

test("DocumentChunk schema stores vector field and external Atlas metadata", () => {
  const chunk = new DocumentChunk({
    documentId: new mongoose.Types.ObjectId(),
    demoSessionId: "demo_123",
    scope: DOCUMENT_SCOPE.USER,
    chunkIndex: 0,
    content: "CentralDocs improves document search.",
    embedding: [0.1, 0.2, 0.3],
    tokenEstimate: 7,
  });

  assert.equal(chunk.embeddingModel, EMBEDDING_MODEL);
  assert.equal(chunk.embeddingDimensions, EMBEDDING_DIMENSIONS);
  assert.equal(chunk.lifecycleStatus, LIFECYCLE_STATUS.ACTIVE);
  assert.deepEqual(chunk.embedding, [0.1, 0.2, 0.3]);
  assert.equal(chunk.sourceLocator.pageNumber, null);
  assert.equal(chunk.validateSync(), undefined);

  assert.deepEqual(DocumentChunk.getAtlasVectorIndexMetadata(), {
    managedByMongoose: false,
    provider: "mongodb_atlas_vector_search",
    vectorField: "embedding",
    dimensions: 768,
    similarity: "cosine",
  });
});

test("DocumentChunk model accepts a realistic embedded chunk payload", () => {
  const documentId = new mongoose.Types.ObjectId();
  const chunk = new DocumentChunk({
    documentId,
    demoSessionId: null,
    folderId: new mongoose.Types.ObjectId(),
    scope: DOCUMENT_SCOPE.MOCK,
    chunkIndex: 4,
    content: "Row 4: Vendor = Northstar Logistics; Status = Pending.",
    embedding: Array.from({ length: 768 }, () => 0.125),
    embeddingModel: "gemini-embedding-2",
    embeddingDimensions: 768,
    tokenEstimate: 14,
    sourceLocator: {
      sheetName: "Vendors",
      rowStart: 4,
      rowEnd: 4,
    },
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
  });

  assert.equal(chunk.validateSync(), undefined);
  assert.equal(chunk.embedding.length, 768);
  assert.equal(chunk.sourceLocator.sheetName, "Vendors");
  assert.equal(chunk.sourceLocator.rowStart, 4);
});

test("DocumentChunk model accepts a direct media embedding chunk payload", () => {
  const documentId = new mongoose.Types.ObjectId();
  const chunk = new DocumentChunk({
    documentId,
    demoSessionId: null,
    folderId: new mongoose.Types.ObjectId(),
    scope: DOCUMENT_SCOPE.MOCK,
    chunkIndex: 100000,
    content: "Direct image embedding: Workflow Diagram",
    embedding: Array.from({ length: 768 }, () => 0.25),
    embeddingModel: "gemini-embedding-2",
    embeddingDimensions: 768,
    tokenEstimate: 0,
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
    chunkKind: "media_direct",
    embeddingInputType: "image",
    mediaMeta: {
      directMultimodal: true,
      seededAt: new Date("2026-06-09T00:00:00.000Z"),
      sourceMimeType: "image/png",
      sourceFilename: "workflow.png",
    },
  });

  assert.equal(chunk.validateSync(), undefined);
  assert.equal(chunk.chunkKind, "media_direct");
  assert.equal(chunk.embeddingInputType, "image");
  assert.equal(chunk.mediaMeta.directMultimodal, true);
  assert.equal(chunk.mediaMeta.sourceMimeType, "image/png");
});

test("DocumentChunk indexes include later retrieval filters", () => {
  assert.equal(hasIndex(DocumentChunk.schema, { documentId: 1 }), true);
  assert.equal(hasIndex(DocumentChunk.schema, { demoSessionId: 1, lifecycleStatus: 1 }), true);
  assert.equal(hasIndex(DocumentChunk.schema, { folderId: 1, lifecycleStatus: 1 }), true);
  assert.equal(hasIndex(DocumentChunk.schema, { scope: 1, lifecycleStatus: 1 }), true);
  assert.equal(hasIndex(DocumentChunk.schema, { chunkIndex: 1 }), true);
  assert.equal(hasIndex(DocumentChunk.schema, { documentId: 1, chunkKind: 1, lifecycleStatus: 1 }), true);
});
