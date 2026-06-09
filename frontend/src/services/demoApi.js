import { apiClient, setDemoSessionId } from "@/lib/apiClient";

/**
 * POST /demo/session — create or resume an anonymous demo session.
 * Persists session.sessionId so it can be resent via the demo session header.
 */
export async function createOrResumeSession() {
  const data = await apiClient.post("/demo/session");
  const sessionId = data && data.session && data.session.sessionId;
  if (sessionId) setDemoSessionId(sessionId);
  return data;
}

/** GET /demo/session — current session limits and usage. */
export function getDemoSession() {
  return apiClient.get("/demo/session");
}

/** POST /demo/bootstrap — ensure the mock workspace exists; returns initial workspace data. */
export function bootstrapDemo() {
  return apiClient.post("/demo/bootstrap");
}

/** GET /demo/guide — demo steps and sample questions. */
export function getDemoGuide() {
  return apiClient.get("/demo/guide");
}
