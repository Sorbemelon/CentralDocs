import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_ERROR_CODE,
  EMBEDDING_LIMITS,
  EMBEDDING_MODEL,
  EMBEDDING_PROVIDER,
  EMBEDDING_TASK_TYPE,
} from "../../constants/embedding.constants.js";
import { createHttpError } from "../../utils/httpError.js";
import {
  classifyAiProviderError,
  isRateLimitError,
  toSafeAiError,
} from "./aiErrorClassifier.service.js";
import {
  createGeminiClientForKeySlot,
  getGeminiClientStatus,
  getGeminiKeySlots,
} from "./geminiClientFactory.js";
import { toAiRoutingAttemptDto } from "./aiRoutingAttempt.dto.js";
import { AI_ROUTING_STATUS } from "../../constants/ai.constants.js";
import { validateEmbeddingVector } from "../embedding/embeddingVector.service.js";

function estimateInputTokens(text = "") {
  return Math.ceil(String(text || "").length / 4);
}

function assertValidEmbeddingInput(text = "") {
  const value = String(text || "");
  if (!value.trim()) {
    throw createHttpError(
      400,
      "Embedding input text is required.",
      EMBEDDING_ERROR_CODE.EMBEDDING_INPUT_EMPTY,
    );
  }
  if (value.length > EMBEDDING_LIMITS.maxInputChars) {
    throw createHttpError(
      400,
      "Embedding input text is too large.",
      EMBEDDING_ERROR_CODE.EMBEDDING_INPUT_TOO_LARGE,
      { maxInputChars: EMBEDDING_LIMITS.maxInputChars },
    );
  }

  return value;
}

function extractVectorFromProviderResponse(response, index = 0) {
  if (Array.isArray(response)) {
    return response;
  }
  if (Array.isArray(response?.embedding)) {
    return response.embedding;
  }
  if (Array.isArray(response?.embedding?.values)) {
    return response.embedding.values;
  }
  if (Array.isArray(response?.embeddings?.[index])) {
    return response.embeddings[index];
  }
  if (Array.isArray(response?.embeddings?.[index]?.values)) {
    return response.embeddings[index].values;
  }
  if (Array.isArray(response?.values)) {
    return response.values;
  }

  return null;
}

async function callEmbeddingClient(client, { text, taskType, title }) {
  const payload = {
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
      taskType,
      ...(title ? { title } : {}),
    },
  };

  if (typeof client?.embedContent === "function") {
    return client.embedContent(payload);
  }
  if (typeof client?.models?.embedContent === "function") {
    return client.models.embedContent(payload);
  }

  throw createHttpError(
    503,
    "Embedding client is unavailable.",
    EMBEDDING_ERROR_CODE.EMBEDDING_NOT_CONFIGURED,
  );
}

function buildEmbeddingResult({
  text,
  vector,
  keySlot,
  warnings = [],
  attempts = [],
} = {}) {
  const embedding = validateEmbeddingVector(vector, EMBEDDING_DIMENSIONS);

  return {
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    embedding,
    usage: {
      inputTokenEstimate: estimateInputTokens(text),
    },
    provider: EMBEDDING_PROVIDER,
    keySlot: Number.isInteger(keySlot) ? keySlot : null,
    warnings,
    attempts,
  };
}

function configuredSlotsStartingAt(keySlot = null, keySlots = null) {
  const slots = (keySlots || getGeminiKeySlots()).map((slot) =>
    typeof slot === "number" ? slot : slot.keySlot,
  );
  if (!Number.isInteger(keySlot) || !slots.includes(keySlot)) {
    return slots;
  }

  return [...slots.slice(slots.indexOf(keySlot)), ...slots.slice(0, slots.indexOf(keySlot))];
}

function createProviderHttpError(error) {
  const safe = toSafeAiError(error);
  return createHttpError(safe.statusCode, safe.message, safe.code, {
    errorType: safe.errorType,
    isRateLimit: safe.isRateLimit,
  });
}

export function getEmbeddingServiceStatus() {
  const status = getGeminiClientStatus();

  return {
    provider: EMBEDDING_PROVIDER,
    status: status.status,
    keyCount: status.keyCount,
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
  };
}

export function assertEmbeddingConfigured({ client = null } = {}) {
  if (client) {
    return true;
  }
  if (getGeminiKeySlots().length === 0) {
    throw createHttpError(
      503,
      "Embedding provider is not configured.",
      EMBEDDING_ERROR_CODE.EMBEDDING_NOT_CONFIGURED,
    );
  }

  return true;
}

export async function embedText({
  text,
  taskType = EMBEDDING_TASK_TYPE.RETRIEVAL_DOCUMENT,
  title = null,
  client = null,
  keySlot = null,
  keySlots = null,
  clientFactory = createGeminiClientForKeySlot,
} = {}) {
  const safeText = assertValidEmbeddingInput(text);

  if (client) {
    let response;
    try {
      response = await callEmbeddingClient(client, { text: safeText, taskType, title });
    } catch (error) {
      throw createProviderHttpError(error);
    }

    return buildEmbeddingResult({
      text: safeText,
      vector: extractVectorFromProviderResponse(response),
      keySlot,
      attempts: [
        toAiRoutingAttemptDto({
          keySlot,
          status: AI_ROUTING_STATUS.SUCCESS,
        }),
      ],
    });
  }

  if (!keySlots) {
    assertEmbeddingConfigured();
  } else if (keySlots.length === 0) {
    throw createHttpError(
      503,
      "Embedding provider is not configured.",
      EMBEDDING_ERROR_CODE.EMBEDDING_NOT_CONFIGURED,
    );
  }
  const attempts = [];
  for (const slot of configuredSlotsStartingAt(keySlot, keySlots)) {
    const slotClient = clientFactory(slot);
    let response;
    try {
      response = await callEmbeddingClient(slotClient, { text: safeText, taskType, title });
    } catch (error) {
      const classified = classifyAiProviderError(error);
      attempts.push(
        toAiRoutingAttemptDto({
          keySlot: slot,
          status: AI_ROUTING_STATUS.FAILED,
          errorType: classified.errorType,
          isRateLimit: classified.isRateLimit,
        }),
      );
      if (!isRateLimitError(error)) {
        throw createProviderHttpError(error);
      }
      continue;
    }

    const successAttempt = toAiRoutingAttemptDto({
      keySlot: slot,
      status: AI_ROUTING_STATUS.SUCCESS,
    });
    return buildEmbeddingResult({
      text: safeText,
      vector: extractVectorFromProviderResponse(response),
      keySlot: slot,
      attempts: [...attempts, successAttempt],
    });
  }

  throw createHttpError(
    429,
    "All embedding key slots are rate limited.",
    EMBEDDING_ERROR_CODE.AI_RATE_LIMIT_EXHAUSTED,
    { attempts },
  );
}

export async function embedTexts({
  texts = [],
  taskType = EMBEDDING_TASK_TYPE.RETRIEVAL_DOCUMENT,
  client = null,
  keySlot = null,
  keySlots = null,
  clientFactory = createGeminiClientForKeySlot,
} = {}) {
  const results = [];

  for (const text of texts) {
    results.push(await embedText({ text, taskType, client, keySlot, keySlots, clientFactory }));
  }

  return results;
}
