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
  keyRotation: "round_robin_with_rate_limit_fallback",
  notes: [
    "Runtime services may call configured Gemini clients outside tests.",
    "Tests continue to use dependency injection and fake clients.",
    "Provider failures are classified without logging API keys or prompt bodies.",
  ],
});
