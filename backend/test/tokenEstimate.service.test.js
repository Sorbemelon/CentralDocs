import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const {
  clampTextToTokenBudget,
  estimateCharsFromTokens,
  estimateTokensFromText,
} = await import("../src/services/chunking/tokenEstimate.service.js");

test("token estimate service estimates tokens from text", () => {
  assert.equal(estimateTokensFromText("abcd"), 1);
  assert.equal(estimateTokensFromText("abcde"), 2);
});

test("token estimate service converts token budget to characters", () => {
  assert.equal(estimateCharsFromTokens(10), 40);
  assert.equal(estimateCharsFromTokens(0), 0);
});

test("token estimate service clamps long text safely", () => {
  const result = clampTextToTokenBudget("A".repeat(100), 10);

  assert.equal(result.text.length, 40);
  assert.equal(result.truncated, true);
});
