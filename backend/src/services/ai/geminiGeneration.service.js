import { GENERATION_MODEL_LANE } from "../../config/aiModels.js";
import { AI_ACTION_TYPE, AI_ROUTING_STATUS } from "../../constants/ai.constants.js";
import { CHAT_SESSION_ERROR_CODE } from "../../constants/chatSession.constants.js";
import { createHttpError, HttpError } from "../../utils/httpError.js";
import {
  classifyAiProviderError,
  toSafeAiError,
} from "./aiErrorClassifier.service.js";
import { toAiRoutingAttemptDto } from "./aiRoutingAttempt.dto.js";
import {
  createGeminiClientForKeySlot,
  getGeminiClientStatus,
  getGeminiKeySlots,
} from "./geminiClientFactory.js";
import { GENERATION_PROVIDER } from "./generationModelLane.service.js";
import { toGenerationResultDto } from "./generationResult.dto.js";

function estimateTokens(text = "") {
  return Math.ceil(String(text || "").length / 4);
}

function assertPrompt(prompt = "") {
  const value = String(prompt || "");
  if (!value.trim()) {
    throw createHttpError(
      400,
      "Generation prompt is required.",
      CHAT_SESSION_ERROR_CODE.INVALID_REQUEST,
    );
  }

  return value;
}

function normalizeKeySlots(keySlots = null) {
  return (keySlots || getGeminiKeySlots())
    .map((slot) => (typeof slot === "number" ? slot : slot.keySlot))
    .filter((slot) => Number.isInteger(slot));
}

function extractTextFromResponse(response) {
  if (typeof response === "string") {
    return response;
  }
  if (typeof response?.text === "string") {
    return response.text;
  }
  if (typeof response?.text === "function") {
    return response.text();
  }

  const parts = response?.candidates?.[0]?.content?.parts || response?.response?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    return parts.map((part) => part.text || "").join("").trim();
  }

  return "";
}

async function callGenerationClient(client, { model, prompt, systemInstruction, options = {} }) {
  const payload = {
    model,
    contents: prompt,
    config: {
      ...(systemInstruction ? { systemInstruction } : {}),
      ...(options.generationConfig || {}),
    },
  };

  if (typeof client?.generateContent === "function") {
    return client.generateContent(payload);
  }
  if (typeof client?.models?.generateContent === "function") {
    return client.models.generateContent(payload);
  }

  throw createHttpError(
    503,
    "Generation client is unavailable.",
    CHAT_SESSION_ERROR_CODE.GENERATION_NOT_CONFIGURED,
  );
}

function safeProviderError(error) {
  if (
    error instanceof HttpError &&
    [
      CHAT_SESSION_ERROR_CODE.GENERATION_NOT_CONFIGURED,
      CHAT_SESSION_ERROR_CODE.INVALID_REQUEST,
    ].includes(error.code)
  ) {
    return error;
  }

  const safe = toSafeAiError(error);
  if (safe.isRateLimit) {
    return createHttpError(
      429,
      "The AI generation provider is rate limited.",
      CHAT_SESSION_ERROR_CODE.GENERATION_RATE_LIMITED,
      { errorType: safe.errorType, isRateLimit: true },
    );
  }
  if (safe.isTransient) {
    return createHttpError(
      503,
      "The AI generation provider is temporarily unavailable. Please try again.",
      CHAT_SESSION_ERROR_CODE.GENERATION_PROVIDER_UNAVAILABLE,
      {
        errorType: safe.errorType,
        isRateLimit: false,
        isTransient: true,
        isRetryable: true,
      },
    );
  }

  return createHttpError(
    502,
    "The AI generation provider returned an unavailable response.",
    CHAT_SESSION_ERROR_CODE.GENERATION_PROVIDER_ERROR,
    {
      errorType: safe.errorType,
      isRateLimit: false,
      isTransient: false,
      isRetryable: false,
    },
  );
}

function laneExhaustedError(attempts = []) {
  const hasTransient = attempts.some((attempt) => attempt.isTransient);
  const hasRateLimit = attempts.some((attempt) => attempt.isRateLimit);

  if (hasTransient) {
    return createHttpError(
      503,
      "The AI generation provider is temporarily unavailable. Please try again.",
      CHAT_SESSION_ERROR_CODE.GENERATION_PROVIDER_UNAVAILABLE,
      {
        aiRouting: attempts,
        errorType: "transient_provider_error",
        isTransient: true,
        isRetryable: true,
      },
    );
  }

  if (hasRateLimit) {
    return createHttpError(
      429,
      "All generation model/key slots are rate limited.",
      CHAT_SESSION_ERROR_CODE.AI_RATE_LIMIT_EXHAUSTED,
      { aiRouting: attempts, errorType: "rate_limit", isRateLimit: true },
    );
  }

  return createHttpError(
    502,
    "The AI generation provider returned an unavailable response.",
    CHAT_SESSION_ERROR_CODE.GENERATION_PROVIDER_ERROR,
    { aiRouting: attempts, errorType: "provider_error" },
  );
}

function successResult({
  text,
  prompt,
  model,
  fallbackLevel,
  keySlot,
  latencyMs,
  attempts,
  usage = {},
} = {}) {
  return toGenerationResultDto({
    text,
    model,
    provider: GENERATION_PROVIDER,
    fallbackUsed: fallbackLevel > 0,
    fallbackLevel,
    keySlot,
    latencyMs,
    usage: {
      estimatedInputTokens: usage.estimatedInputTokens || estimateTokens(prompt),
      estimatedOutputTokens: usage.estimatedOutputTokens || estimateTokens(text),
    },
    aiRouting: attempts,
    warnings: [],
  });
}

export function getGenerationServiceStatus() {
  const status = getGeminiClientStatus();

  return {
    provider: GENERATION_PROVIDER,
    status: status.status,
    keyCount: status.keyCount,
    generationModelLane: [...GENERATION_MODEL_LANE],
  };
}

export function assertGenerationConfigured({ client = null, keySlots = null } = {}) {
  if (client) {
    return true;
  }
  if (normalizeKeySlots(keySlots).length === 0) {
    throw createHttpError(
      503,
      "Generation provider is not configured.",
      CHAT_SESSION_ERROR_CODE.GENERATION_NOT_CONFIGURED,
    );
  }

  return true;
}

export async function generateTextWithLane({
  prompt,
  systemInstruction = null,
  client = null,
  clientFactory = createGeminiClientForKeySlot,
  keySlots = null,
  models = GENERATION_MODEL_LANE,
  options = {},
} = {}) {
  const safePrompt = assertPrompt(prompt);
  const started = Date.now();
  const actionType = options.actionType || AI_ACTION_TYPE.CHAT_ANSWER;

  if (client) {
    const model = models[0] || GENERATION_MODEL_LANE[0];
    let response;
    try {
      response = await callGenerationClient(client, {
        model,
        prompt: safePrompt,
        systemInstruction,
        options,
      });
    } catch (error) {
      throw safeProviderError(error);
    }

    return successResult({
      text: extractTextFromResponse(response),
      prompt: safePrompt,
      model,
      fallbackLevel: 0,
      keySlot: null,
      latencyMs: Date.now() - started,
      attempts: [
        toAiRoutingAttemptDto({
          actionType,
          model,
          status: AI_ROUTING_STATUS.SUCCESS,
          fallbackLevel: 0,
        }),
      ],
      usage: response?.usageMetadata,
    });
  }

  const slots = normalizeKeySlots(keySlots);
  if (slots.length === 0) {
    assertGenerationConfigured({ keySlots: [] });
  }

  const attempts = [];
  for (const [fallbackLevel, model] of models.entries()) {
    for (const keySlot of slots) {
      const slotClient = clientFactory(keySlot);
      let response;
      try {
        response = await callGenerationClient(slotClient, {
          model,
          prompt: safePrompt,
          systemInstruction,
          options,
        });
      } catch (error) {
        const classified = classifyAiProviderError(error);
        attempts.push(
          toAiRoutingAttemptDto({
            actionType,
            model,
            keySlot,
            status: AI_ROUTING_STATUS.FAILED,
            errorType: classified.errorType,
            isRateLimit: classified.isRateLimit,
            isTransient: classified.isTransient,
            isRetryable: classified.isRetryable,
            fallbackLevel,
          }),
        );
        if (!classified.isRetryable) {
          throw safeProviderError(error);
        }
        continue;
      }

      const successAttempt = toAiRoutingAttemptDto({
        actionType,
        model,
        keySlot,
        status: AI_ROUTING_STATUS.SUCCESS,
        fallbackLevel,
      });
      return successResult({
        text: extractTextFromResponse(response),
        prompt: safePrompt,
        model,
        fallbackLevel,
        keySlot,
        latencyMs: Date.now() - started,
        attempts: [...attempts, successAttempt],
        usage: response?.usageMetadata,
      });
    }
  }

  throw laneExhaustedError(attempts);
}
