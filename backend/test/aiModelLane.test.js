import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
delete process.env.GEMINI_API_KEY_1;
delete process.env.GEMINI_API_KEY_2;
delete process.env.GEMINI_API_KEY_3;
delete process.env.GEMINI_API_KEYS;

const { getAiModelLane } = await import("../src/services/ai/aiModelLane.js");
const { getGeminiClientStatus } = await import("../src/services/ai/geminiClientFactory.js");

test("AI model lane matches locked Gemini model decisions", () => {
  const lane = getAiModelLane();

  assert.equal(lane.embedding.model, "gemini-embedding-2");
  assert.equal(lane.embedding.dimensions, 768);
  assert.equal(lane.generation.primary, "gemini-3.5-flash");
  assert.deepEqual(lane.generation.fallbacks, [
    "gemini-3-flash-preview",
    "gemini-2.5-flash",
  ]);
  assert.deepEqual(lane.generation.lane, [
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
    "gemini-2.5-flash",
  ]);
});

test("Gemini client factory reports no live calls in Phase 1B", () => {
  const status = getGeminiClientStatus();

  assert.equal(status.provider, "gemini");
  assert.equal(status.status, "not_configured");
  assert.equal(status.keyCount, 0);
  assert.equal(status.liveCallsEnabled, false);
});
