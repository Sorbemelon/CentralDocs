import { AI_MODELS, AI_ROUTING_DESIGN, GENERATION_MODEL_LANE } from "../../config/aiModels.js";
import { env } from "../../config/env.js";

export function getAiModelLane() {
  return {
    provider: AI_ROUTING_DESIGN.provider,
    liveCallsEnabled: AI_ROUTING_DESIGN.liveCallsEnabled,
    embedding: AI_MODELS.embedding,
    generation: {
      primary: AI_MODELS.generation.primary,
      fallbacks: AI_MODELS.generation.fallbacks,
      lane: GENERATION_MODEL_LANE,
    },
    keyRotation: {
      strategy: AI_ROUTING_DESIGN.keyRotation,
      configuredKeyCount: env.geminiKeyCount,
    },
  };
}

export function getGeminiStatus() {
  return env.geminiKeyCount > 0 ? "configured" : "not_configured";
}
