import { apiClient } from "@/lib/apiClient";

/** GET /trash — list trashed session-created folders/documents. */
export function listTrash() {
  return apiClient.get("/trash");
}
