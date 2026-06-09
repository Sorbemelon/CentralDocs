import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const {
  estimateTokensFromText,
  normalizeExtractedText,
} = await import("../src/services/extraction/normalizeText.service.js");

test("normalizeExtractedText collapses whitespace and duplicate consecutive lines", () => {
  const warnings = [];
  const result = normalizeExtractedText("  # Heading  \r\n\r\nRepeated\nRepeated\n\n- Bullet  one   \n");

  assert.equal(result.text, "# Heading\n\nRepeated\n\n- Bullet one");
  assert.equal(result.truncated, false);
  assert.deepEqual(warnings, []);
});

test("normalizeExtractedText preserves headings and bullets enough for search", () => {
  const result = normalizeExtractedText("# Strategy\n\n- Pilot scope\n- Rollout risks");

  assert.match(result.text, /# Strategy/);
  assert.match(result.text, /- Pilot scope/);
  assert.match(result.text, /Rollout risks/);
});

test("normalizeExtractedText estimates tokens and truncates to 24,000 characters", () => {
  const warnings = [];
  const result = normalizeExtractedText("A".repeat(25000), { warnings });

  assert.equal(result.text.length, 24000);
  assert.equal(result.truncated, true);
  assert.equal(result.estimatedTokenCount, 6000);
  assert.equal(warnings[0].code, "OPTIMIZED_TEXT_TRUNCATED");
});

test("estimateTokensFromText uses an approximate four-character ratio", () => {
  assert.equal(estimateTokensFromText("abcd"), 1);
  assert.equal(estimateTokensFromText("abcde"), 2);
});
