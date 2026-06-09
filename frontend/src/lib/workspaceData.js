// Pure mappers between backend DTOs and the frontend row model used by the
// Phase 7A workspace components. Keeping these pure means the components are
// unchanged structurally whether data comes from the backend or the fallback.

import { DOC_STATUS, SOURCE_KIND } from "./constants";
import { FALLBACK_USAGE } from "@/data/mockWorkspaceFallback";

const MB = 1024 * 1024;

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
    source: isMock ? SOURCE_KIND.mock : SOURCE_KIND.uploaded,
    readOnly: dto.readOnly === true,
    group: isMock ? "demo" : "user",
    documentCount: dto.documentCount ?? 0,
    lifecycleStatus: dto.lifecycleStatus,
  };
}

export function normalizeDocument(dto = {}) {
  return {
    id: dto.id,
    title: dto.title || dto.originalFilename || "Untitled",
    type: toTypeBadge(dto),
    folderId: dto.folderId || null,
    folderName: dto.folderName || null,
    source: mapSource(dto),
    status: mapDocStatus(dto.status),
    readOnly: dto.readOnly === true,
    excerpt: dto.previewText || dto.description || "",
    chunkCount: dto.contentStats?.chunkCount ?? 0,
    downloadAvailable: dto.downloadAvailable,
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
