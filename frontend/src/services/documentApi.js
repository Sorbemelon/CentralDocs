import { apiClient } from "@/lib/apiClient";

function toQuery(params) {
  const entries = Object.entries(params || {}).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (!entries.length) return "";
  const search = new URLSearchParams(entries.map(([k, v]) => [k, String(v)]));
  return `?${search.toString()}`;
}

/** GET /documents — list documents with filters (incl. trash). */
export function listDocuments(params) {
  return apiClient.get(`/documents${toQuery(params)}`);
}

/** GET /documents/:documentId — document detail. */
export function getDocument(documentId) {
  return apiClient.get(`/documents/${documentId}`);
}

/** GET /documents/:documentId/preview — optimized text/metadata preview. */
export function previewDocument(documentId) {
  return apiClient.get(`/documents/${documentId}/preview`);
}

/** GET /documents/:documentId/status — processing status. */
export function getDocumentStatus(documentId) {
  return apiClient.get(`/documents/${documentId}/status`);
}

/** PATCH /documents/:documentId/move — move document to a user folder. */
export function moveDocument(documentId, payload) {
  return apiClient.patch(`/documents/${documentId}/move`, payload);
}

/** DELETE /documents/:documentId — soft-delete an uploaded/generated document. */
export function deleteDocument(documentId) {
  return apiClient.delete(`/documents/${documentId}`);
}

/** POST /documents/:documentId/restore — restore an uploaded/generated document. */
export function restoreDocument(documentId) {
  return apiClient.post(`/documents/${documentId}/restore`);
}

/** POST /documents/:documentId/download-url — create a presigned download URL. */
export function createDownloadUrl(documentId, payload) {
  return apiClient.post(`/documents/${documentId}/download-url`, payload || {});
}
