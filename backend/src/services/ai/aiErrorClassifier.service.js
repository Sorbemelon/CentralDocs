import { EMBEDDING_ERROR_CODE } from "../../constants/embedding.constants.js";

function stringifyErrorSignal(error) {
  return [
    error?.status,
    error?.statusCode,
    error?.code,
    error?.name,
    error?.message,
    error?.reason,
    error?.type,
    error?.details?.reason,
    error?.details?.errorType,
    error?.error?.status,
    error?.error?.code,
    error?.error?.message,
    error?.cause?.code,
    error?.cause?.message,
  ]
    .filter((value) => value !== undefined && value !== null)
    .join(" ")
    .toLowerCase();
}

export function isRateLimitError(error) {
  const signal = stringifyErrorSignal(error);

  return (
    signal.includes("429") ||
    signal.includes("resource_exhausted") ||
    signal.includes("rate limit") ||
    signal.includes("ratelimit") ||
    signal.includes("quota") ||
    signal.includes("too many requests")
  );
}

export function isTransientProviderError(error) {
  const signal = stringifyErrorSignal(error);

  return (
    signal.includes("500") ||
    signal.includes("502") ||
    signal.includes("503") ||
    signal.includes("504") ||
    signal.includes("internal") ||
    signal.includes("unavailable") ||
    signal.includes("deadline_exceeded") ||
    signal.includes("deadline") ||
    signal.includes("timeout") ||
    signal.includes("timed out") ||
    signal.includes("overloaded") ||
    signal.includes("capacity") ||
    signal.includes("temporarily unavailable") ||
    signal.includes("service unavailable") ||
    signal.includes("upstream unavailable") ||
    signal.includes("socket hang up") ||
    signal.includes("econnreset") ||
    signal.includes("etimedout")
  );
}

export function isNonRetryableProviderError(error) {
  const signal = stringifyErrorSignal(error);

  return (
    signal.includes("400") ||
    signal.includes("401") ||
    signal.includes("403") ||
    signal.includes("invalid_argument") ||
    signal.includes("invalid argument") ||
    signal.includes("invalid request") ||
    signal.includes("bad request") ||
    signal.includes("unauthenticated") ||
    signal.includes("unauthorized") ||
    signal.includes("authentication") ||
    signal.includes("permission") ||
    signal.includes("forbidden") ||
    signal.includes("model not found") ||
    signal.includes("not found") ||
    signal.includes("safety") ||
    signal.includes("policy")
  );
}

export function classifyAiProviderError(error) {
  if (isRateLimitError(error)) {
    return {
      code: EMBEDDING_ERROR_CODE.EMBEDDING_RATE_LIMITED,
      errorType: "rate_limit",
      isRateLimit: true,
      isTransient: false,
      isRetryable: true,
      statusCode: 429,
    };
  }

  if (isNonRetryableProviderError(error)) {
    return {
      code: EMBEDDING_ERROR_CODE.EMBEDDING_PROVIDER_ERROR,
      errorType: "non_retryable_provider_error",
      isRateLimit: false,
      isTransient: false,
      isRetryable: false,
      statusCode: 502,
    };
  }

  if (isTransientProviderError(error)) {
    return {
      code: EMBEDDING_ERROR_CODE.EMBEDDING_PROVIDER_ERROR,
      errorType: "transient_provider_error",
      isRateLimit: false,
      isTransient: true,
      isRetryable: true,
      statusCode: 503,
    };
  }

  return {
    code: EMBEDDING_ERROR_CODE.EMBEDDING_PROVIDER_ERROR,
    errorType: "provider_error",
    isRateLimit: false,
    isTransient: false,
    isRetryable: false,
    statusCode: 502,
  };
}

export function toSafeAiError(error) {
  const classified = classifyAiProviderError(error);

  return {
    code: classified.code,
    message: classified.isRateLimit
      ? "The AI provider rate limit was reached."
      : classified.isTransient
        ? "The AI provider is temporarily unavailable. Please try again."
        : "The AI provider returned an unavailable response.",
    errorType: classified.errorType,
    isRateLimit: classified.isRateLimit,
    isTransient: classified.isTransient,
    isRetryable: classified.isRetryable,
    statusCode: classified.statusCode,
  };
}
