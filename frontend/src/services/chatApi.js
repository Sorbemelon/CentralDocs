import { apiClient } from "@/lib/apiClient";

const CHAT_ANSWER_TIMEOUT_MS = 120000;
const GENERATED_DOCUMENT_TIMEOUT_MS = 180000;

/** GET /chats — list saved chats. */
export function listChats() {
  return apiClient.get("/chats");
}

/** POST /chats — create a chat session. */
export function createChat(payload) {
  return apiClient.post("/chats", payload || {});
}

/** GET /chats/:chatId — chat with messages and resolved selection. */
export function getChat(chatId) {
  return apiClient.get(`/chats/${chatId}`);
}

/** PATCH /chats/:chatId — rename/archive a chat. */
export function updateChat(chatId, payload) {
  return apiClient.patch(`/chats/${chatId}`, payload);
}

/** DELETE /chats/:chatId — archive/delete a chat session. */
export function deleteChat(chatId) {
  return apiClient.delete(`/chats/${chatId}`);
}

/** PATCH /chats/:chatId/selection — update the chat's selected docs/folders. */
export function updateChatSelection(chatId, payload) {
  return apiClient.patch(`/chats/${chatId}/selection`, payload);
}

/**
 * POST /chats/:chatId/messages — send a prompt and get the grounded answer.
 * payload: { content, selectedDocumentIds?, selectedFolderIds? }
 * Response: { chat, userMessage, assistantMessage, references, usage, remaining }.
 */
export function sendChatMessage(chatId, payload, options) {
  return apiClient.post(`/chats/${chatId}/messages`, payload || {}, {
    timeoutMs: CHAT_ANSWER_TIMEOUT_MS,
    ...options,
  });
}

/**
 * POST /chats/:chatId/generated-documents — turn the chat into a saved document.
 * payload: { instruction, filename, includeReferences, includeCurrentSelectedDocuments }
 * Response: { document, generation, download, usage, remaining }.
 */
export function generateDocumentFromChat(chatId, payload, options) {
  return apiClient.post(`/chats/${chatId}/generated-documents`, payload || {}, {
    timeoutMs: GENERATED_DOCUMENT_TIMEOUT_MS,
    ...options,
  });
}
