import {
  getAiProvider,
  getEmbeddingDimensions,
  getEmbeddingModel,
  getGenerationFallbackModels,
  getGenerationPrimaryModel,
} from "./env.js";

export const AI_MODELS = Object.freeze({
  embedding: {
    model: getEmbeddingModel(),
    dimensions: getEmbeddingDimensions(),
  },
  generation: {
    primary: getGenerationPrimaryModel(),
    fallbacks: getGenerationFallbackModels(),
  },
});

export const GENERATION_MODEL_LANE = Object.freeze([
  AI_MODELS.generation.primary,
  ...AI_MODELS.generation.fallbacks,
]);

export const AI_ROUTING_DESIGN = Object.freeze({
  provider: getAiProvider(),
  liveCallsEnabled: false,
  keyRotation: "planned_round_robin_with_failure_fallback",
  notes: [
    "Phase 1A defines model lanes only; no Gemini network calls are made.",
    "Future routing should rotate across configured keys before falling back models.",
    "Future live-call failures should be recorded without logging API keys or prompt bodies.",
  ],
});
