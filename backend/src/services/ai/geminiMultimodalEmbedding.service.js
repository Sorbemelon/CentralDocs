import { readFile } from "node:fs/promises";
import {
  MEDIA_EMBEDDING_DIMENSIONS,
  MEDIA_EMBEDDING_ERROR_CODE,
  MEDIA_EMBEDDING_MODEL,
  MEDIA_EMBEDDING_PROVIDER,
} from "../../constants/mediaEmbedding.constants.js";
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
import { assertPathInsideMockDocumentsRoot } from "../mockData/mockAsset.service.js";
import { isSupportedDirectMediaMimeType, getMediaInputTypeFromMimeType } from "../mediaEmbedding/mediaEmbeddingTypes.service.js";
import { validateEmbeddingVector } from "../embedding/embeddingVector.service.js";

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
  return createHttpError(safe.statusCode, safe.message, safe.isRateLimit
    ? MEDIA_EMBEDDING_ERROR_CODE.MEDIA_EMBEDDING_RATE_LIMITED
    : MEDIA_EMBEDDING_ERROR_CODE.MEDIA_EMBEDDING_PROVIDER_ERROR, {
    errorType: safe.errorType,
    isRateLimit: safe.isRateLimit,
  });
}

async function readMockMediaFile(filePath) {
  let safePath;
  try {
    safePath = assertPathInsideMockDocumentsRoot(filePath);
  } catch (error) {
    throw createHttpError(
      400,
      "Mock media asset path is invalid.",
      MEDIA_EMBEDDING_ERROR_CODE.MEDIA_ASSET_PATH_INVALID,
    );
  }

  try {
    return await readFile(safePath);
  } catch (error) {
    throw createHttpError(
      404,
      "Mock media asset file was not found.",
      MEDIA_EMBEDDING_ERROR_CODE.MEDIA_ASSET_NOT_FOUND,
    );
  }
}

async function callMultimodalEmbeddingClient(client, { body, mimeType, title }) {
  const payload = {
    model: MEDIA_EMBEDDING_MODEL,
    contents: [
      {
        inlineData: {
          mimeType,
          data: body.toString("base64"),
        },
      },
      ...(title ? [{ text: title }] : []),
    ],
    config: {
      outputDimensionality: MEDIA_EMBEDDING_DIMENSIONS,
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
    "Media embedding client is unavailable.",
    MEDIA_EMBEDDING_ERROR_CODE.MEDIA_EMBEDDING_NOT_CONFIGURED,
  );
}

function buildMediaEmbeddingResult({
  vector,
  keySlot,
  inputType,
  mimeType,
  warnings = [],
  attempts = [],
} = {}) {
  const embedding = validateEmbeddingVector(vector, MEDIA_EMBEDDING_DIMENSIONS);

  return {
    model: MEDIA_EMBEDDING_MODEL,
    dimensions: MEDIA_EMBEDDING_DIMENSIONS,
    embedding,
    provider: MEDIA_EMBEDDING_PROVIDER,
    keySlot: Number.isInteger(keySlot) ? keySlot : null,
    inputType,
    mimeType,
    warnings,
    attempts,
  };
}

export function getMultimodalEmbeddingStatus() {
  const status = getGeminiClientStatus();

  return {
    provider: MEDIA_EMBEDDING_PROVIDER,
    status: status.status,
    keyCount: status.keyCount,
    model: MEDIA_EMBEDDING_MODEL,
    dimensions: MEDIA_EMBEDDING_DIMENSIONS,
  };
}

export function assertMultimodalEmbeddingConfigured({ client = null } = {}) {
  if (client) {
    return true;
  }
  if (getGeminiKeySlots().length === 0) {
    throw createHttpError(
      503,
      "Media embedding provider is not configured.",
      MEDIA_EMBEDDING_ERROR_CODE.MEDIA_EMBEDDING_NOT_CONFIGURED,
    );
  }

  return true;
}

export async function embedMediaFile({
  filePath,
  mimeType,
  title = null,
  client = null,
  keySlot = null,
  keySlots = null,
  clientFactory = createGeminiClientForKeySlot,
} = {}) {
  if (!isSupportedDirectMediaMimeType(mimeType)) {
    throw createHttpError(
      400,
      "Direct media embedding does not support this MIME type.",
      MEDIA_EMBEDDING_ERROR_CODE.MEDIA_EMBEDDING_UNSUPPORTED,
      { mimeType: mimeType || null },
    );
  }

  const body = await readMockMediaFile(filePath);
  const inputType = getMediaInputTypeFromMimeType(mimeType);

  if (client) {
    let response;
    try {
      response = await callMultimodalEmbeddingClient(client, { body, mimeType, title });
    } catch (error) {
      throw createProviderHttpError(error);
    }

    return buildMediaEmbeddingResult({
      vector: extractVectorFromProviderResponse(response),
      keySlot,
      inputType,
      mimeType,
    });
  }

  if (!keySlots) {
    assertMultimodalEmbeddingConfigured();
  } else if (keySlots.length === 0) {
    throw createHttpError(
      503,
      "Media embedding provider is not configured.",
      MEDIA_EMBEDDING_ERROR_CODE.MEDIA_EMBEDDING_NOT_CONFIGURED,
    );
  }

  const attempts = [];
  for (const slot of configuredSlotsStartingAt(keySlot, keySlots)) {
    const slotClient = clientFactory(slot);
    let response;
    try {
      response = await callMultimodalEmbeddingClient(slotClient, { body, mimeType, title });
    } catch (error) {
      const classified = classifyAiProviderError(error);
      attempts.push({
        actionType: "embedding",
        model: MEDIA_EMBEDDING_MODEL,
        keySlot: slot,
        status: "failed",
        errorType: classified.errorType,
        isRateLimit: classified.isRateLimit,
        fallbackLevel: 0,
      });
      if (!isRateLimitError(error)) {
        throw createProviderHttpError(error);
      }
      continue;
    }

    return buildMediaEmbeddingResult({
      vector: extractVectorFromProviderResponse(response),
      keySlot: slot,
      inputType,
      mimeType,
      attempts: [
        ...attempts,
        {
          actionType: "embedding",
          model: MEDIA_EMBEDDING_MODEL,
          keySlot: slot,
          status: "success",
          errorType: null,
          isRateLimit: false,
          fallbackLevel: 0,
        },
      ],
    });
  }

  throw createHttpError(
    429,
    "All media embedding key slots are rate limited.",
    MEDIA_EMBEDDING_ERROR_CODE.AI_RATE_LIMIT_EXHAUSTED,
    { attempts },
  );
}
