export function toGenerationResultDto(result = {}) {
  return {
    text: result.text || "",
    model: result.model || null,
    provider: result.provider || "gemini",
    fallbackUsed: Boolean(result.fallbackUsed),
    fallbackLevel: result.fallbackLevel || 0,
    keySlot: Number.isInteger(result.keySlot) ? result.keySlot : null,
    latencyMs: result.latencyMs ?? null,
    usage: {
      estimatedInputTokens: result.usage?.estimatedInputTokens || 0,
      estimatedOutputTokens: result.usage?.estimatedOutputTokens || 0,
    },
    aiRouting: result.aiRouting || [],
    warnings: result.warnings || [],
  };
}
