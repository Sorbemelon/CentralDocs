import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const {
  applyChunkCountLimit,
  capContentPreview,
  getMaxChunksForSource,
} = await import("../src/services/chunking/chunkLimit.service.js");

test("chunk limits select max chunks by source", () => {
  assert.equal(getMaxChunksForSource({ scope: "user" }), 10);
  assert.equal(getMaxChunksForSource({ sourceType: "upload" }), 10);
  assert.equal(getMaxChunksForSource({ scope: "generated" }), 8);
  assert.equal(getMaxChunksForSource({ sourceType: "generated" }), 8);
  assert.equal(getMaxChunksForSource({ scope: "mock" }), 16);
  assert.equal(getMaxChunksForSource({}), 10);
});

test("chunk limits cap content previews", () => {
  assert.equal(capContentPreview("A".repeat(800)).length, 500);
});

test("chunk limits truncate draft count with warning", () => {
  const chunks = Array.from({ length: 12 }, (_, index) => ({ chunkIndex: index }));
  const result = applyChunkCountLimit(chunks, { maxChunks: 10, warnings: [] });

  assert.equal(result.truncated, true);
  assert.equal(result.chunks.length, 10);
  assert.equal(result.warnings[0].code, "CHUNK_COUNT_TRUNCATED");
});
