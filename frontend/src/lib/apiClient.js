import { DEFAULT_API_BASE_URL, DEMO_SESSION_HEADER, STORAGE_KEYS } from "./constants";

export const API_BASE_URL =
  (import.meta.env && import.meta.env.VITE_API_BASE_URL) || DEFAULT_API_BASE_URL;

/** Normalized API error so callers can branch on offline vs. HTTP failures. */
export class ApiError extends Error {
  constructor(message, { status = 0, code, offline = false, data } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.offline = offline;
    this.data = data;
  }
}

export function getDemoSessionId() {
  try {
    return localStorage.getItem(STORAGE_KEYS.demoSession);
  } catch {
    return null;
  }
}

export function setDemoSessionId(sessionId) {
  if (!sessionId) return;
  try {
    localStorage.setItem(STORAGE_KEYS.demoSession, sessionId);
  } catch {
    /* ignore */
  }
}

export function clearDemoSessionId() {
  try {
    localStorage.removeItem(STORAGE_KEYS.demoSession);
  } catch {
    /* ignore */
  }
}

function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const base = API_BASE_URL.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

/**
 * Core request helper.
 * - attaches the demo session header when present
 * - sends/parses JSON
 * - times out via AbortController
 * - distinguishes network/offline failures from HTTP errors
 */
export async function request(path, { method = "GET", body, headers = {}, timeoutMs = 12000, signal } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const sessionId = getDemoSessionId();
  const finalHeaders = { Accept: "application/json", ...headers };
  if (body !== undefined) finalHeaders["Content-Type"] = "application/json";
  if (sessionId) finalHeaders[DEMO_SESSION_HEADER] = sessionId;

  let response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "include",
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    const aborted = err && err.name === "AbortError";
    throw new ApiError(
      aborted ? "The request timed out." : "Could not reach the CentralDocs backend.",
      { offline: true },
    );
  }
  clearTimeout(timeout);

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
      `Request failed with status ${response.status}.`;
    const code = data && data.error && data.error.code;
    throw new ApiError(message, { status: response.status, code, data });
  }

  return data;
}

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, body, options) => request(path, { ...options, method: "POST", body }),
  patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
  delete: (path, options) => request(path, { ...options, method: "DELETE" }),
};
