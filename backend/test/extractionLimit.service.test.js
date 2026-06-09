import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const {
  capSourceBlocks,
  createTextPreview,
  truncateText,
} = await import("../src/services/extraction/extractionLimit.service.js");

test("extraction limits cap previews", () => {
  assert.equal(createTextPreview("A".repeat(2500)).length, 2000);
});

test("extraction limits truncate optimized text with state", () => {
  const result = truncateText("A".repeat(24001), 24000);

  assert.equal(result.text.length, 24000);
  assert.equal(result.truncated, true);
});

test("extraction limits cap source blocks and emit warning", () => {
  const warnings = [];
  const sourceBlocks = Array.from({ length: 130 }, (_, index) => ({
    blockIndex: index,
    blockType: "paragraph",
    text: `Block ${index}`,
    locator: {},
    metadata: {},
  }));
  const result = capSourceBlocks(sourceBlocks, warnings);

  assert.equal(result.sourceBlocks.length, 120);
  assert.equal(result.truncated, true);
  assert.equal(warnings[0].code, "SOURCE_BLOCKS_TRUNCATED");
});
