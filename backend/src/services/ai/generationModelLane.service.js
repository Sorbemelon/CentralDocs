import { AI_MODELS, GENERATION_MODEL_LANE } from "../../config/aiModels.js";
import { CHAT_SESSION_ERROR_CODE } from "../../constants/chatSession.constants.js";
import { createHttpError } from "../../utils/httpError.js";
import { classifyAiProviderError } from "./aiErrorClassifier.service.js";

export const GENERATION_PROVIDER = "gemini";

export function getGenerationModelLane() {
  return {
    provider: GENERATION_PROVIDER,
    primary: AI_MODELS.generation.primary,
    fallbacks: [...AI_MODELS.generation.fallbacks],
    lane: [...GENERATION_MODEL_LANE],
  };
}

export function getGenerationFallbackLevel(model) {
  const index = GENERATION_MODEL_LANE.indexOf(model);
  return index >= 0 ? index : 0;
}

export function buildGenerationRoutePlan({ models = GENERATION_MODEL_LANE, keySlots = [] } = {}) {
  return models.flatMap((model, fallbackLevel) =>
    keySlots.map((keySlot) => ({
      model,
      fallbackLevel,
      keySlot: typeof keySlot === "number" ? keySlot : keySlot.keySlot,
    })),
  );
}

export function assertGenerationLaneExhaustion(error) {
  const classified = classifyAiProviderError(error);

  if (!classified.isRetryable) {
    throw error;
  }

  if (classified.isTransient) {
    throw createHttpError(
      503,
      "The AI generation provider is temporarily unavailable. Please try again.",
      CHAT_SESSION_ERROR_CODE.GENERATION_PROVIDER_UNAVAILABLE,
    );
  }

  throw createHttpError(
    429,
    "All generation model/key slots are rate limited.",
    CHAT_SESSION_ERROR_CODE.AI_RATE_LIMIT_EXHAUSTED,
  );
}
