import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const {
  classifyAiProviderError,
  isNonRetryableProviderError,
  isRateLimitError,
  isTransientProviderError,
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
  const classified = classifyAiProviderError({ message: "provider failed" });

  assert.equal(classified.code, "EMBEDDING_PROVIDER_ERROR");
  assert.equal(classified.errorType, "provider_error");
  assert.equal(classified.isRateLimit, false);
  assert.equal(classified.isRetryable, false);
});

test("AI error classifier detects transient provider errors", () => {
  const cases = [
    { status: 500 },
    { statusCode: 502 },
    { statusCode: 503 },
    { statusCode: 504 },
    { code: "UNAVAILABLE" },
    { code: "INTERNAL" },
    { code: "DEADLINE_EXCEEDED" },
    { message: "model is overloaded" },
    { message: "temporarily unavailable" },
    { message: "request timeout" },
    { message: "socket hang up" },
    { code: "ECONNRESET" },
    { code: "ETIMEDOUT" },
  ];

  for (const error of cases) {
    assert.equal(isTransientProviderError(error), true, JSON.stringify(error));
    const classified = classifyAiProviderError(error);
    assert.equal(classified.errorType, "transient_provider_error");
    assert.equal(classified.isTransient, true);
    assert.equal(classified.isRetryable, true);
    assert.equal(classified.statusCode, 503);
  }
});

test("AI error classifier detects non-retryable provider errors", () => {
  const cases = [
    { status: 400, message: "bad request" },
    { code: "INVALID_ARGUMENT" },
    { status: 401, message: "authentication failed" },
    { status: 403, message: "permission denied" },
    { message: "model not found" },
    { message: "blocked by safety policy" },
  ];

  for (const error of cases) {
    assert.equal(isNonRetryableProviderError(error), true, JSON.stringify(error));
    const classified = classifyAiProviderError(error);
    assert.equal(classified.errorType, "non_retryable_provider_error");
    assert.equal(classified.isRetryable, false);
  }
});

test("AI error classifier produces safe output without raw secret text", () => {
  const safe = toSafeAiError({ message: "bad key SECRET_VALUE" });

  assert.equal(JSON.stringify(safe).includes("SECRET_VALUE"), false);
  assert.equal(safe.code, "EMBEDDING_PROVIDER_ERROR");
});
