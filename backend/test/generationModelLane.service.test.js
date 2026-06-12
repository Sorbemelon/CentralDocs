import { test } from "node:test";
import assert from "node:assert/strict";

const {
  assertGenerationLaneExhaustion,
  buildGenerationRoutePlan,
  getGenerationModelLane,
} = await import("../src/services/ai/generationModelLane.service.js");

test("generation model lane keeps locked model order", () => {
  const lane = getGenerationModelLane();

  assert.equal(lane.primary, "gemini-3.5-flash");
  assert.deepEqual(lane.fallbacks, ["gemini-3-flash-preview", "gemini-2.5-flash"]);
  assert.deepEqual(lane.lane, [
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
    "gemini-2.5-flash",
  ]);
});

test("generation route plan rotates keys before fallback model", () => {
  const plan = buildGenerationRoutePlan({
    models: ["gemini-3.5-flash", "gemini-3-flash-preview"],
    keySlots: [0, 1],
  });

  assert.deepEqual(plan, [
    { model: "gemini-3.5-flash", fallbackLevel: 0, keySlot: 0 },
    { model: "gemini-3.5-flash", fallbackLevel: 0, keySlot: 1 },
    { model: "gemini-3-flash-preview", fallbackLevel: 1, keySlot: 0 },
    { model: "gemini-3-flash-preview", fallbackLevel: 1, keySlot: 1 },
  ]);
});

test("generation lane exhaustion distinguishes transient and non-retryable errors", () => {
  assert.throws(
    () => assertGenerationLaneExhaustion(Object.assign(new Error("service unavailable"), { status: 503 })),
    { statusCode: 503, code: "GENERATION_PROVIDER_UNAVAILABLE" },
  );
  assert.throws(
    () => assertGenerationLaneExhaustion(Object.assign(new Error("quota exceeded"), { status: 429 })),
    { statusCode: 429, code: "AI_RATE_LIMIT_EXHAUSTED" },
  );
  assert.throws(
    () => assertGenerationLaneExhaustion(Object.assign(new Error("invalid argument"), { status: 400 })),
    /invalid argument/,
  );
});
