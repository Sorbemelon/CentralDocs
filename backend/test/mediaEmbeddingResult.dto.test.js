import { test } from "node:test";
import assert from "node:assert/strict";

const { toMediaEmbeddingResultDto } = await import("../src/services/mediaEmbedding/mediaEmbeddingResult.dto.js");

test("media embedding result DTO returns safe cache metadata only", () => {
  const result = toMediaEmbeddingResultDto({
    document: {
      id: "mock_doc",
      title: "Workflow",
      fileKind: "image",
      objectKey: "mock/workspace/original/doc/workflow.png",
    },
    status: "completed",
    cached: false,
    dryRun: false,
    chunk: {
      id: "chunk_1",
      embedding: Array.from({ length: 768 }, () => 0.1),
      mediaMeta: {
        sourceFilename: "workflow.png",
      },
    },
    inputType: "image",
    warnings: [],
    embeddedAt: new Date("2026-06-09T00:00:00.000Z"),
  });

  assert.deepEqual(result, {
    documentId: "mock_doc",
    title: "Workflow",
    fileKind: "image",
    status: "completed",
    cached: false,
    dryRun: false,
    chunkId: "chunk_1",
    embeddingModel: "gemini-embedding-2",
    embeddingDimensions: 768,
    inputType: "image",
    warnings: [],
    embeddedAt: "2026-06-09T00:00:00.000Z",
  });
  assert.equal(JSON.stringify(result).includes("embedding"), true);
  assert.equal(JSON.stringify(result).includes("[0."), false);
  assert.equal(JSON.stringify(result).includes("objectKey"), false);
});
