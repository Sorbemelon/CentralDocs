import { apiClient, API_BASE_URL, ApiError, getDemoSessionId } from "@/lib/apiClient";
import { DEMO_SESSION_HEADER } from "@/lib/constants";

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

/** POST /documents/:documentId/retry — retry failed processing for an uploaded document. */
export function retryDocument(documentId, payload) {
  return apiClient.post(`/documents/${documentId}/retry`, payload || {});
}

/** POST /documents/:documentId/download-url — create a presigned download URL. */
export function createDownloadUrl(documentId, payload) {
  return apiClient.post(`/documents/${documentId}/download-url`, payload || {});
}

/**
 * POST /documents/upload — upload exactly one supported file (multipart).
 * The browser sets the multipart boundary, so this uses a dedicated fetch
 * instead of apiClient (which sends JSON). Field name must be `file`.
 */
export async function uploadDocument({ file, folderId, title, signal } = {}) {
  if (!file) throw new ApiError("No file selected for upload.", { status: 0 });

  const form = new FormData();
  form.append("file", file);
  if (folderId) form.append("folderId", folderId);
  if (title) form.append("title", title);

  const headers = { Accept: "application/json" };
  const sessionId = getDemoSessionId();
  if (sessionId) headers[DEMO_SESSION_HEADER] = sessionId;

  const url = `${API_BASE_URL.replace(/\/$/, "")}/documents/upload`;

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers, // do NOT set Content-Type; the browser adds the multipart boundary
      body: form,
      credentials: "include",
      signal,
    });
  } catch (err) {
    const aborted = err && err.name === "AbortError";
    throw new ApiError(aborted ? "The upload was cancelled." : "Could not reach the CentralDocs backend.", {
      offline: !aborted,
    });
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      (data && (data.message || (data.error && data.error.message))) ||
      `Upload failed with status ${response.status}.`;
    const code = data && data.error && data.error.code;
    throw new ApiError(message, { status: response.status, code, data });
  }

  return data;
}
