import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.GEMINI_API_KEY_1 = "";
process.env.GEMINI_API_KEY_2 = "";
process.env.GEMINI_API_KEY_3 = "";
process.env.GEMINI_API_KEYS = "";

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
  assert.deepEqual(lane.liveRuntime, {
    enabled: false,
    reason: "missing_api_key",
  });
  assert.equal(lane.keyRotation.strategy, "round_robin_with_rate_limit_fallback");
});

test("Gemini client factory reports runtime readiness without exposing keys", () => {
  const status = getGeminiClientStatus();

  assert.equal(status.provider, "gemini");
  assert.equal(status.status, "not_configured");
  assert.equal(status.configured, false);
  assert.equal(status.keyCount, 0);
  assert.deepEqual(status.liveRuntime, {
    enabled: false,
    reason: "missing_api_key",
  });
});
