// Pure mappers between backend DTOs and the frontend row model used by the
// Phase 7A workspace components. Keeping these pure means the components are
// unchanged structurally whether data comes from the backend or the fallback.

import { DEMO_LIMITS, DOC_STATUS, SOURCE_KIND } from "./constants";
import { FALLBACK_USAGE } from "@/data/mockWorkspaceFallback";

const MB = 1024 * 1024;
const KB = 1024;

/** Map backend document status to the 4 frontend buckets. */
export function mapDocStatus(status) {
  switch (status) {
    case "ready":
      return DOC_STATUS.ready;
    case "failed":
      return DOC_STATUS.failed;
    case "trashed":
      return DOC_STATUS.trashed;
    default:
      // uploaded / extracting / optimizing / chunking / embedding
      return DOC_STATUS.processing;
  }
}

/** Map backend scope/sourceType to provenance. */
export function mapSource({ scope, sourceType } = {}) {
  if (sourceType === "generated" || scope === "generated") return SOURCE_KIND.generated;
  if (sourceType === "mock" || scope === "mock") return SOURCE_KIND.mock;
  return SOURCE_KIND.uploaded;
}

const FILE_KIND_TO_TYPE = {
  markdown: "MD",
  text: "TXT",
  csv: "CSV",
  tsv: "TSV",
  pdf: "PDF",
  docx: "DOCX",
  xlsx: "XLSX",
  pptx: "PPTX",
  image: "PNG",
  audio: "MP3",
  video: "MP4",
};

function toTypeBadge(dto) {
  if (dto.fileExtension) return String(dto.fileExtension).toUpperCase();
  if (dto.type) return String(dto.type).toUpperCase();
  return FILE_KIND_TO_TYPE[dto.fileKind] || "FILE";
}

export function normalizeFolder(dto = {}) {
  const isMock = dto.scope === "mock" || dto.readOnly === true;
  return {
    id: dto.id,
    name: dto.name,
    parentFolderId: dto.parentFolderId || null,
    source: isMock ? SOURCE_KIND.mock : SOURCE_KIND.uploaded,
    readOnly: dto.readOnly === true,
    group: isMock ? "demo" : "user",
    documentCount: dto.documentCount ?? 0,
    lifecycleStatus: dto.lifecycleStatus,
  };
}

export function normalizeDocument(dto = {}) {
  const source = mapSource(dto);
  const rawStatus = dto.status; // uploaded/extracting/optimizing/chunking/embedding/ready/failed
  return {
    id: dto.id,
    title: dto.title || dto.originalFilename || "Untitled",
    type: toTypeBadge(dto),
    folderId: dto.folderId || null,
    folderName: dto.folderName || null,
    source,
    status: mapDocStatus(rawStatus),
    rawStatus,
    statusMessage: dto.statusMessage || dto.processing?.statusMessage || null,
    readOnly: dto.readOnly === true,
    excerpt: dto.previewText || dto.extractedTextPreview || dto.description || "",
    chunkCount: dto.contentStats?.chunkCount ?? 0,
    sizeBytes: dto.sizeBytes ?? 0,
    attachable: dto.attachable,
    searchable: dto.searchable,
    downloadAvailable: dto.downloadAvailable,
    createdAt: dto.createdAt ? relativeTime(dto.createdAt) : null,
    // Backend /status is authoritative; this derived flag drives the row affordance.
    retryAvailable: source === SOURCE_KIND.uploaded && ["failed", "uploaded"].includes(rawStatus),
  };
}

export function normalizeChat(dto = {}) {
  const docCount = dto.currentSelectedDocumentCount ?? (dto.currentSelectedDocumentIds?.length || 0);
  const folderCount = dto.currentSelectedFolderCount ?? (dto.currentSelectedFolderIds?.length || 0);
  return {
    id: dto.id,
    title: dto.title || "Untitled chat",
    docCount,
    folderCount,
    contextCount: docCount + folderCount,
    messageCount: dto.messageCount ?? 0,
    selectedDocumentIds: dto.currentSelectedDocumentIds || [],
    selectedFolderIds: dto.currentSelectedFolderIds || [],
    resolvedDocumentCount: dto.resolvedDocumentCount,
    lifecycleStatus: dto.lifecycleStatus,
    local: false,
  };
}

/** Flatten a /trash response into compact rows (folders + documents). */
export function normalizeTrash(response = {}) {
  const folders = (response.folders || []).map((f) => ({
    id: f.id,
    title: f.name,
    type: "FOLDER",
    source: mapSource(f),
    kind: "folder",
    deletedAt: relativeTime(f.updatedAt || f.archivedAt),
  }));
  const documents = (response.documents || []).map((d) => ({
    id: d.id,
    title: d.title || d.originalFilename || "Untitled",
    type: toTypeBadge(d),
    source: mapSource(d),
    kind: "document",
    deletedAt: relativeTime(d.updatedAt || d.archivedAt),
  }));
  return [...folders, ...documents];
}

/** Map a demo session into the UsageCard/top-bar usage shape. Falls back to zeros. */
export function normalizeUsage(session) {
  if (!session) return FALLBACK_USAGE;
  const usage = session.usage || {};
  const limits = session.limits || {};
  return {
    uploads: { used: usage.uploadedFiles ?? 0, limit: limits.maxUploadedFiles ?? FALLBACK_USAGE.uploads.limit },
    chats: { used: usage.chatSessions ?? 0, limit: limits.maxChatSessions ?? FALLBACK_USAGE.chats.limit },
    prompts: { used: usage.aiPrompts ?? 0, limit: limits.maxAiPrompts ?? FALLBACK_USAGE.prompts.limit },
    generated: { used: usage.generatedDocuments ?? 0, limit: limits.maxGeneratedDocuments ?? FALLBACK_USAGE.generated.limit },
    storageMb: {
      used: Math.round(((usage.storageBytes ?? 0) / MB) * 10) / 10,
      limit: limits.maxStorageBytes ? Math.round(limits.maxStorageBytes / MB) : FALLBACK_USAGE.storageMb.limit,
    },
  };
}

/** Map an upload/retry response usage snapshot into the UsageCard shape (fixed demo limits). */
export function normalizeUsageFromSnapshot(usage = {}) {
  return {
    uploads: { used: usage.uploadedFiles ?? 0, limit: DEMO_LIMITS.uploads },
    chats: { used: usage.chatSessions ?? 0, limit: DEMO_LIMITS.savedChats },
    prompts: { used: usage.aiPrompts ?? 0, limit: DEMO_LIMITS.prompts },
    generated: { used: usage.generatedDocuments ?? 0, limit: DEMO_LIMITS.generatedDocuments },
    storageMb: {
      used: Math.round(((usage.storageBytes ?? 0) / MB) * 10) / 10,
      limit: DEMO_LIMITS.storageMb,
    },
  };
}

// --- Upload validation (client-side gate; backend re-validates) ---

/** Allowed public upload extensions → backend file kind. */
const UPLOAD_ALLOWED_EXTENSIONS = Object.freeze({
  txt: "text",
  md: "markdown",
  csv: "csv",
  tsv: "tsv",
  pdf: "pdf",
  docx: "docx",
});

/** Per-kind size caps (bytes). */
const UPLOAD_SIZE_CAPS = Object.freeze({
  text: 500 * KB,
  markdown: 500 * KB,
  csv: 500 * KB,
  tsv: 500 * KB,
  pdf: 2 * MB,
  docx: 1 * MB,
});

/** Explicitly rejected extensions (rejection text only — never allowed upload types). */
export const UPLOAD_REJECTED_EXTENSIONS = Object.freeze([
  "xlsx", "pptx", "png", "jpg", "jpeg", "gif", "webp",
  "mp3", "wav", "mp4", "mov", "zip", "rar", "7z", "exe", "dll",
]);

export const UPLOAD_ALLOWED_LABEL = "txt, md, csv, tsv, pdf, docx";

export function formatBytes(bytes = 0) {
  if (bytes >= MB) return `${Math.round((bytes / MB) * 10) / 10} MB`;
  if (bytes >= KB) return `${Math.round(bytes / KB)} KB`;
  return `${bytes} B`;
}

function extensionOf(filename = "") {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 && dot < filename.length - 1 ? filename.slice(dot + 1).toLowerCase() : "";
}

/**
 * Validate a single file before enabling Upload.
 * Returns { valid, kind?, sizeLabel?, error? }.
 */
export function validateUploadFile(file) {
  if (!file) return { valid: false, error: "No file selected." };

  const ext = extensionOf(file.name || "");
  if (!ext) {
    return { valid: false, error: `Unknown file type. Allowed: ${UPLOAD_ALLOWED_LABEL}.` };
  }
  if (!(ext in UPLOAD_ALLOWED_EXTENSIONS)) {
    return {
      valid: false,
      error: `.${ext} is not a supported upload type. Allowed: ${UPLOAD_ALLOWED_LABEL}.`,
    };
  }
  if (!file.size || file.size === 0) {
    return { valid: false, error: "This file is empty." };
  }

  const kind = UPLOAD_ALLOWED_EXTENSIONS[ext];
  const cap = UPLOAD_SIZE_CAPS[kind];
  if (file.size > cap) {
    return {
      valid: false,
      error: `Too large for .${ext} (max ${formatBytes(cap)}).`,
      kind,
      sizeLabel: formatBytes(file.size),
    };
  }

  return { valid: true, kind, sizeLabel: formatBytes(file.size) };
}

// --- Generated document validation (client-side gate; backend re-validates) ---

/** Generated documents may only be saved as Markdown or plain text. */
export const GENERATED_DOC_FORMATS = Object.freeze(["md", "txt"]);

const GENERATED_FILENAME_MAX = 120; // mirrors backend maxFilenameLength

/** Validate the free-form instruction. Returns { valid, value?, error? }. */
export function validateGeneratedInstruction(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return { valid: false, error: "Describe the document to generate." };
  if (trimmed.length > DEMO_LIMITS.generateInstructionLength) {
    return {
      valid: false,
      error: `Instruction must be ${DEMO_LIMITS.generateInstructionLength.toLocaleString()} characters or fewer.`,
    };
  }
  return { valid: true, value: trimmed };
}

/**
 * Validate/normalize the output filename. Returns { valid, value?, extension?, error? }.
 * Mirrors the backend: trim, default `.md`, allow only md/txt, reject path
 * segments and "..", require a basename, and cap the total length.
 */
export function validateGeneratedFilename(filename) {
  const raw = String(filename || "").trim();
  if (!raw) return { valid: false, error: "Enter a filename." };
  if (/[\\/]/.test(raw) || raw.includes("..")) {
    return { valid: false, error: "Filename can't contain folders or path segments." };
  }
  const dot = raw.lastIndexOf(".");
  const hasExt = dot > 0 && dot < raw.length - 1;
  const base = hasExt ? raw.slice(0, dot) : raw;
  const ext = hasExt ? raw.slice(dot + 1).toLowerCase() : "md"; // default to .md
  if (!base.trim()) return { valid: false, error: "Enter a name before the extension." };
  if (!GENERATED_DOC_FORMATS.includes(ext)) {
    return { valid: false, error: "Use a .md or .txt filename." };
  }
  let value = `${base}.${ext}`;
  if (value.length > GENERATED_FILENAME_MAX) {
    const cap = Math.max(1, GENERATED_FILENAME_MAX - (ext.length + 1));
    value = `${base.slice(0, cap)}.${ext}`;
  }
  return { valid: true, value, extension: ext };
}

// --- Semantic search ---

/** Cosine similarity (~0..1) → compact percent label. */
export function scoreToPercent(score) {
  if (typeof score !== "number") return null;
  return `${Math.round(Math.max(0, Math.min(1, score)) * 100)}%`;
}

function secondsToClock(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  const total = Math.round(n);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatTimestamp(ts) {
  if (ts == null) return null;
  const str = String(ts);
  if (/^\d+(\.\d+)?(-\d+(\.\d+)?)?$/.test(str)) {
    return str.split("-").map(secondsToClock).join("–");
  }
  return str;
}

/**
 * Build a compact, safe locator label from a reference object.
 * Uses only safe display fields (no internal storage keys, vectors, or paths).
 */
export function formatSearchLocator(ref = {}) {
  const parts = [];
  if (ref.pageNumber != null) parts.push(`page ${ref.pageNumber}`);
  if (ref.slideNumber != null) parts.push(`slide ${ref.slideNumber}`);
  if (ref.sheetName) parts.push(ref.rowRange ? `sheet ${ref.sheetName} · rows ${ref.rowRange}` : `sheet ${ref.sheetName}`);
  else if (ref.rowRange) parts.push(`rows ${ref.rowRange}`);
  if (ref.mediaTimestamp != null) parts.push(formatTimestamp(ref.mediaTimestamp));
  if (ref.sectionTitle) parts.push(ref.sectionTitle);
  return parts.length ? parts.join(" · ") : null;
}

/**
 * Normalize a /search/semantic response into row + reference view models.
 * Reads only safe display fields (no model internals, vectors, or storage keys).
 */
export function normalizeSearchResponse(res = {}) {
  const refs = res.references || [];
  const results = (res.results || []).map((r, i) => {
    const ref = refs[i] || {};
    return {
      id: r.documentId || ref.documentId || null,
      refNumber: ref.citationNumber ?? i + 1,
      title: ref.documentTitle || r.documentTitle || "Untitled",
      fileKind: ref.fileType || r.fileKind || null,
      folderName: ref.folderName || r.folderName || null,
      excerpt: ref.excerptPreview || r.contentPreview || "",
      score: typeof r.score === "number" ? r.score : ref.similarityScore ?? null,
      locator: formatSearchLocator(ref),
      chunkId: r.chunkId || ref.chunkId || null,
    };
  });

  const references = refs.map((ref, i) => ({
    number: ref.citationNumber ?? i + 1,
    title: ref.documentTitle || "Untitled",
    locator: formatSearchLocator(ref),
    usedFor: ref.usedFor || "semantic search match",
  }));

  return {
    results,
    references,
    stats: {
      resultCount: res.stats?.resultCount ?? results.length,
      searchedDocumentCount: res.stats?.searchedDocumentCount ?? 0,
    },
    warnings: res.warnings || [],
  };
}

// --- Chat messages ---

/** Normalize one reference (shared shape with search). Safe display fields only. */
export function normalizeReference(ref = {}) {
  return {
    number: ref.citationNumber ?? null,
    documentId: ref.documentId || null,
    title: ref.documentTitle || "Untitled",
    fileType: ref.fileType || null,
    folderName: ref.folderName || null,
    locator: formatSearchLocator(ref),
    excerpt: ref.excerptPreview || "",
    score: ref.similarityScore ?? null,
    usedFor: ref.usedFor || null,
  };
}

/**
 * Normalize a ChatMessage DTO into a compact view model.
 * Exposes the exact document names used (folder selections included) so the
 * prompt's context collapse can list names, not counts.
 * Keeps only safe aiMeta fields (model/latency/tokens/fallback); drops internals.
 */
export function normalizeChatMessage(dto = {}) {
  const attachedDocs = dto.attachedDocumentSnapshot || [];
  const attachedFolders = dto.attachedFolderSnapshot || [];
  const contextDocs = dto.resolvedDocumentSnapshot?.length
    ? dto.resolvedDocumentSnapshot
    : attachedDocs;
  const meta = dto.aiMeta;
  return {
    id: dto.id,
    role: dto.role,
    content: dto.content || "",
    status: dto.status || null,
    createdAt: dto.createdAt || null,
    contextDocs: contextDocs.map((d) => ({
      title: d.title || d.originalFilename || "Untitled",
      folderName: d.folderName || null,
    })),
    attachedFolderNames: attachedFolders.map((f) => f.name || f.title || "").filter(Boolean),
    references: (dto.referencesUsed || []).map(normalizeReference),
    aiMeta: meta
      ? {
          model: meta.generationModel || null,
          fallbackUsed: Boolean(meta.fallbackUsed),
          latencyMs: meta.latencyMs ?? null,
          inputTokens: meta.estimatedInputTokens ?? null,
          outputTokens: meta.estimatedOutputTokens ?? null,
        }
      : null,
  };
}

/** Local (not-yet-persisted) chats use a `local-` id prefix. */
export function isLocalChatId(id) {
  return typeof id === "string" && id.startsWith("local-");
}

function relativeTime(value) {
  if (!value) return "recently";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "recently";
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
