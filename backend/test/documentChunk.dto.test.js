import { test } from "node:test";
import assert from "node:assert/strict";

const { toDocumentChunkDto, toDocumentChunkDtos } = await import(
  "../src/services/indexing/documentChunk.dto.js"
);

test("document chunk DTO hides embeddings and storage internals", () => {
  const dto = toDocumentChunkDto({
    _id: "chunk_1",
    documentId: "doc_1",
    demoSessionId: "demo_1",
    scope: "user",
    chunkIndex: 0,
    content: "A".repeat(700),
    embedding: [0.1, 0.2],
    objectKey: "demo-sessions/demo_1/uploads/doc_1/private.pdf",
    sourceLocator: { pageNumber: 2 },
    embeddingModel: "gemini-embedding-2",
    embeddingDimensions: 768,
    lifecycleStatus: "active",
  });

  assert.equal(dto.id, "chunk_1");
  assert.equal(dto.contentPreview.length, 500);
  assert.equal("embedding" in dto, false);
  assert.equal("objectKey" in dto, false);
  assert.equal(JSON.stringify(dto).includes("demo-sessions"), false);
});

test("document chunk DTO maps arrays", () => {
  assert.equal(toDocumentChunkDtos([{ chunkIndex: 0 }, { chunkIndex: 1 }]).length, 2);
});

test("document chunk DTO exposes safe direct media metadata", () => {
  const dto = toDocumentChunkDto({
    _id: "chunk_media",
    documentId: "doc_media",
    scope: "mock",
    chunkIndex: 100000,
    content: "Direct image embedding: Workflow Diagram",
    embedding: Array.from({ length: 768 }, () => 0.1),
    embeddingModel: "gemini-embedding-2",
    embeddingDimensions: 768,
    lifecycleStatus: "active",
    chunkKind: "media_direct",
    embeddingInputType: "image",
    mediaMeta: {
      directMultimodal: true,
      seededAt: "2026-06-09T00:00:00.000Z",
      sourceMimeType: "image/png",
      sourceFilename: "workflow.png",
      localPath: "D:\\private\\workflow.png",
    },
  });

  assert.equal(dto.chunkKind, "media_direct");
  assert.equal(dto.embeddingInputType, "image");
  assert.equal(dto.mediaMeta.directMultimodal, true);
  assert.equal(dto.mediaMeta.sourceMimeType, "image/png");
  assert.equal(JSON.stringify(dto).includes("localPath"), false);
  assert.equal(JSON.stringify(dto).includes("private"), false);
  assert.equal("embedding" in dto, false);
});
