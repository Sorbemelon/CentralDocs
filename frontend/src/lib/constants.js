// Shared constants for the CentralDocs frontend foundation.

/** localStorage keys (namespaced). */
export const STORAGE_KEYS = Object.freeze({
  theme: "centraldocs-theme",
  demoSession: "centraldocs.demoSessionId",
});

/** Header used to resend the demo session id (cookie is httpOnly, unreadable in JS). */
export const DEMO_SESSION_HEADER = "x-demo-session-id";

/** Default API base, overridable via VITE_API_BASE_URL. Backend default PORT is 8080. */
export const DEFAULT_API_BASE_URL = "http://localhost:8080/api";

/** App display name. */
export const APP_NAME = "CentralDocs";

/** Backend reachability states surfaced in the UI. */
export const BACKEND_STATUS = Object.freeze({
  idle: "idle",
  starting: "starting",
  ready: "ready",
  offline: "offline",
});

/**
 * Demo limits mirrored from docs/scopian/sources/CENTRALDOCS_DEMO_MODE.md.
 * Display-only in Phase 7A; the backend remains the source of truth.
 */
export const DEMO_LIMITS = Object.freeze({
  sessionLifetimeDays: 3,
  savedChats: 5,
  prompts: 10,
  generatedDocuments: 3,
  uploads: 5,
  userFolders: 10,
  storageMb: 20,
  promptLength: 1500,
  generateInstructionLength: 2000,
  searchQueryLength: 500,
  retrievalTopK: 15,
  visibleReferences: 10,
  contextSelectionDocumentLimit: 10,
});

/** Center work area tabs (components, not routes). */
export const WORKSPACE_TABS = Object.freeze([
  { id: "chat", label: "Chat" },
  { id: "search", label: "Search" },
  { id: "preview", label: "Preview" },
  { id: "generated", label: "Generated" },
]);

/** Source provenance for documents/folders. */
export const SOURCE_KIND = Object.freeze({
  mock: "mock",
  uploaded: "uploaded",
  generated: "generated",
});

/** Document lifecycle/processing status. */
export const DOC_STATUS = Object.freeze({
  ready: "ready",
  processing: "processing",
  failed: "failed",
  trashed: "trashed",
});

/** Sources panel segmented filter. */
export const SOURCE_FILTER = Object.freeze({
  active: "active",
  trash: "trash",
});
