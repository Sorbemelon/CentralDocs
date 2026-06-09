import { apiClient } from "@/lib/apiClient";

/** GET /health — backend status. */
export function getHealth() {
  return apiClient.get("/health");
}

/** GET /health/warm — wake a cold Render instance. */
export function warmBackend() {
  return apiClient.get("/health/warm", { timeoutMs: 20000 });
}

/** GET /health/dependencies — safe Mongo/S3/AI config status (no secrets). */
export function getDependencies() {
  return apiClient.get("/health/dependencies");
}
