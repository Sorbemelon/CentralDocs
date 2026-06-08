import { AI_MODELS } from "../config/aiModels.js";

export const AI_ACTION_TYPE = Object.freeze({
  EMBEDDING: "embedding",
  CHAT: "chat",
  GENERATE_DOCUMENT: "generate_document",
  CHAT_ANSWER: "chat_answer",
  DOCUMENT_GENERATION: "document_generation",
});

export const AI_ROUTING_ACTION_TYPES = Object.freeze([
  AI_ACTION_TYPE.EMBEDDING,
  AI_ACTION_TYPE.CHAT,
  AI_ACTION_TYPE.GENERATE_DOCUMENT,
]);

export const AI_MESSAGE_ACTION_TYPES = Object.freeze([
  AI_ACTION_TYPE.CHAT_ANSWER,
  AI_ACTION_TYPE.DOCUMENT_GENERATION,
]);

export const AI_ROUTING_STATUS = Object.freeze({
  SUCCESS: "success",
  FAILED: "failed",
});

export const AI_ROUTING_STATUSES = Object.freeze(Object.values(AI_ROUTING_STATUS));

export const EMBEDDING_MODEL = AI_MODELS.embedding.model;
export const EMBEDDING_DIMENSIONS = AI_MODELS.embedding.dimensions;
