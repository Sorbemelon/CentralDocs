import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const {
  classifyAiProviderError,
  isRateLimitError,
  toSafeAiError,
} = await import("../src/services/ai/aiErrorClassifier.service.js");

test("AI error classifier detects 429 status", () => {
  assert.equal(isRateLimitError({ status: 429 }), true);
  assert.equal(classifyAiProviderError({ statusCode: 429 }).isRateLimit, true);
});

test("AI error classifier detects resource exhausted and quota messages", () => {
  assert.equal(isRateLimitError({ code: "RESOURCE_EXHAUSTED" }), true);
  assert.equal(isRateLimitError({ message: "quota exceeded" }), true);
  assert.equal(isRateLimitError({ message: "too many requests" }), true);
});

test("AI error classifier handles generic provider error", () => {
  const classified = classifyAiProviderError({ message: "provider unavailable" });

  assert.equal(classified.code, "EMBEDDING_PROVIDER_ERROR");
  assert.equal(classified.errorType, "provider_error");
  assert.equal(classified.isRateLimit, false);
});

test("AI error classifier produces safe output without raw secret text", () => {
  const safe = toSafeAiError({ message: "bad key SECRET_VALUE" });

  assert.equal(JSON.stringify(safe).includes("SECRET_VALUE"), false);
  assert.equal(safe.code, "EMBEDDING_PROVIDER_ERROR");
});
