import { EMBEDDING_ERROR_CODE } from "../../constants/embedding.constants.js";

function stringifyErrorSignal(error) {
  return [
    error?.status,
    error?.statusCode,
    error?.code,
    error?.name,
    error?.message,
    error?.details?.reason,
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

export function classifyAiProviderError(error) {
  if (isRateLimitError(error)) {
    return {
      code: EMBEDDING_ERROR_CODE.EMBEDDING_RATE_LIMITED,
      errorType: "rate_limit",
      isRateLimit: true,
      statusCode: 429,
    };
  }

  return {
    code: EMBEDDING_ERROR_CODE.EMBEDDING_PROVIDER_ERROR,
    errorType: "provider_error",
    isRateLimit: false,
    statusCode: 502,
  };
}

export function toSafeAiError(error) {
  const classified = classifyAiProviderError(error);

  return {
    code: classified.code,
    message: classified.isRateLimit
      ? "The AI provider rate limit was reached."
      : "The AI provider returned an unavailable response.",
    errorType: classified.errorType,
    isRateLimit: classified.isRateLimit,
    statusCode: classified.statusCode,
  };
}
