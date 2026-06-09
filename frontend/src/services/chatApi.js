import { apiClient } from "@/lib/apiClient";

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
