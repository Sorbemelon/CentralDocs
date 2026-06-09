const CHARS_PER_TOKEN = 4;

export function estimateTokensFromText(text = "") {
  return Math.ceil(String(text || "").length / CHARS_PER_TOKEN);
}

export function estimateCharsFromTokens(tokens = 0) {
  const parsed = Number(tokens);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.floor(parsed * CHARS_PER_TOKEN);
}

export function clampTextToTokenBudget(text = "", maxTokens = 0) {
  const value = String(text || "");
  const maxChars = estimateCharsFromTokens(maxTokens);
  if (!maxChars || value.length <= maxChars) {
    return {
      text: value,
      truncated: false,
    };
  }

  return {
    text: value.slice(0, maxChars).trimEnd(),
    truncated: true,
  };
}
