import { test } from "node:test";
import assert from "node:assert/strict";

const {
  buildStatusPatch,
  markChunking,
  markEmbedding,
  markExtracting,
  markFailed,
  markOptimizing,
  markReady,
  toSafeIndexingStatus,
} = await import("../src/services/indexing/documentIndexingStatus.service.js");

test("indexing status helpers match document status constants", () => {
  assert.equal(markExtracting().status, "extracting");
  assert.equal(markOptimizing().status, "optimizing");
  assert.equal(markChunking().status, "chunking");
  assert.equal(markEmbedding().status, "embedding");

  const ready = markReady({
    contentStats: {
      extractedCharCount: 12,
      optimizedCharCount: 10,
      estimatedTokenCount: 3,
      chunkCount: 1,
    },
  });

  assert.equal(ready.status, "ready");
  assert.equal(ready.contentStats.chunkCount, 1);
});

test("indexing status failure messages are sanitized", () => {
  const failed = markFailed({
    error: new Error("Failed at D:\\secret\\file.md with apiKey=SECRET_VALUE"),
  });
  const custom = buildStatusPatch("failed", "token=abc123 /Users/private/file.md");
  const safe = toSafeIndexingStatus({
    id: "doc_1",
    status: "failed",
    statusMessage: "secret:VALUE C:\\Users\\private\\file.md",
  });

  assert.equal(failed.status, "failed");
  assert.equal(failed.statusMessage.includes("SECRET_VALUE"), false);
  assert.equal(failed.statusMessage.includes("D:\\"), false);
  assert.equal(custom.statusMessage.includes("abc123"), false);
  assert.equal(custom.statusMessage.includes("/Users/private"), false);
  assert.equal(safe.statusMessage.includes("VALUE"), false);
});
