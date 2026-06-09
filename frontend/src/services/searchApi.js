import { apiClient } from "@/lib/apiClient";

/**
 * POST /search/semantic — semantic (meaning-based) search.
 * payload: { query, selectedDocumentIds, selectedFolderIds, scope, fileKinds, topK }
 * Uses the shared apiClient (x-demo-session-id header + normalized ApiError).
 * The backend never returns the raw query vector; the UI never surfaces it.
 */
export function semanticSearch(payload, options) {
  return apiClient.post("/search/semantic", payload || {}, options);
}
