import { AI_MODELS, AI_ROUTING_DESIGN, GENERATION_MODEL_LANE } from "../../config/aiModels.js";
import { env } from "../../config/env.js";

function liveRuntimeStatus() {
  const configured = env.geminiKeyCount > 0;
  return {
    enabled: configured,
    reason: configured ? "configured" : "missing_api_key",
  };
}

export function getAiModelLane() {
  return {
    provider: AI_ROUTING_DESIGN.provider,
    embedding: AI_MODELS.embedding,
    generation: {
      primary: AI_MODELS.generation.primary,
      fallbacks: AI_MODELS.generation.fallbacks,
      lane: GENERATION_MODEL_LANE,
    },
    liveRuntime: liveRuntimeStatus(),
    keyRotation: {
      strategy: AI_ROUTING_DESIGN.keyRotation,
      configuredKeyCount: env.geminiKeyCount,
    },
  };
}

export function getAiDependencyStatus() {
  const configured = env.geminiKeyCount > 0;
  return {
    provider: AI_ROUTING_DESIGN.provider,
    configured,
    keyCount: env.geminiKeyCount,
    embedding: {
      model: AI_MODELS.embedding.model,
      dimensions: AI_MODELS.embedding.dimensions,
      configured,
    },
    generation: {
      primaryModel: AI_MODELS.generation.primary,
      fallbackModels: AI_MODELS.generation.fallbacks,
      configured,
    },
    liveRuntime: liveRuntimeStatus(),
    keyRotation: {
      strategy: AI_ROUTING_DESIGN.keyRotation,
      configuredKeyCount: env.geminiKeyCount,
    },
  };
}

export function getGeminiStatus() {
  return env.geminiKeyCount > 0 ? "configured" : "not_configured";
}
