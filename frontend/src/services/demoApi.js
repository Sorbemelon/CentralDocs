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

/**
 * POST /demo/clear — clear this demo session's uploads, generated docs, chats,
 * and user folders. Mock demo data remains. The backend may preserve usage
 * quota in production, so persist the returned session id for subsequent calls.
 */
export async function clearDemoSession(options) {
  const data = await apiClient.post("/demo/clear", undefined, options);
  const sessionId = data && data.session && data.session.sessionId;
  if (sessionId) setDemoSessionId(sessionId);
  return data;
}

/** POST /demo/bootstrap — ensure the mock workspace exists; returns initial workspace data. */
export function bootstrapDemo() {
  return apiClient.post("/demo/bootstrap");
}

/** GET /demo/guide — demo steps and sample questions. */
export function getDemoGuide() {
  return apiClient.get("/demo/guide");
}
