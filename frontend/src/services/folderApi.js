import { apiClient } from "@/lib/apiClient";

function toQuery(params) {
  const entries = Object.entries(params || {}).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (!entries.length) return "";
  const search = new URLSearchParams(entries.map(([k, v]) => [k, String(v)]));
  return `?${search.toString()}`;
}

/** GET /folders — list folder tree. */
export function listFolders(params) {
  return apiClient.get(`/folders${toQuery(params)}`);
}

/** GET /folders/:folderId/documents — documents within a folder. */
export function listFolderDocuments(folderId, params) {
  return apiClient.get(`/folders/${folderId}/documents${toQuery(params)}`);
}

/** POST /folders — create a user folder. */
export function createFolder(payload) {
  return apiClient.post("/folders", payload);
}

/** PATCH /folders/:folderId — rename a user folder. */
export function renameFolder(folderId, payload) {
  return apiClient.patch(`/folders/${folderId}`, payload);
}

/** DELETE /folders/:folderId — soft-delete a user folder. */
export function deleteFolder(folderId) {
  return apiClient.delete(`/folders/${folderId}`);
}

/** POST /folders/:folderId/restore — restore a soft-deleted folder. */
export function restoreFolder(folderId) {
  return apiClient.post(`/folders/${folderId}/restore`);
}
