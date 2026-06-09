import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_ERROR_CODE,
  EMBEDDING_MODEL,
} from "../../constants/embedding.constants.js";
import { createHttpError } from "../../utils/httpError.js";
import { embedText } from "../ai/geminiEmbedding.service.js";
import { toEmbeddedChunkDraft } from "./embeddingResult.dto.js";
import { validateEmbeddingVector } from "./embeddingVector.service.js";

function assertChunkContent(chunk = {}) {
  if (!String(chunk.content || "").trim()) {
    throw createHttpError(
      400,
      "Chunk content is required for embedding.",
      EMBEDDING_ERROR_CODE.EMBEDDING_INPUT_EMPTY,
    );
  }
}

export async function embedChunkDraft(
  chunk,
  {
    embedder = embedText,
    taskType,
    keySlot = null,
    embeddedAt = new Date(),
  } = {},
) {
  assertChunkContent(chunk);
  const embeddingResult = await embedder({
    text: chunk.content,
    title: chunk.sourceDocumentTitle,
    taskType,
    keySlot,
  });
  const embedding = validateEmbeddingVector(
    embeddingResult.embedding,
    embeddingResult.dimensions || EMBEDDING_DIMENSIONS,
  );

  return toEmbeddedChunkDraft(
    { ...chunk },
    {
      ...embeddingResult,
      embedding,
      model: embeddingResult.model || EMBEDDING_MODEL,
      dimensions: embeddingResult.dimensions || EMBEDDING_DIMENSIONS,
    },
    { embeddedAt },
  );
}
