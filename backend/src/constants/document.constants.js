export const FOLDER_SCOPE = Object.freeze({
  MOCK: "mock",
  USER: "user",
});

export const FOLDER_SCOPES = Object.freeze(Object.values(FOLDER_SCOPE));

export const DOCUMENT_SCOPE = Object.freeze({
  MOCK: "mock",
  USER: "user",
  GENERATED: "generated",
});

export const DOCUMENT_SCOPES = Object.freeze(Object.values(DOCUMENT_SCOPE));

export const SOURCE_TYPE = Object.freeze({
  MOCK: "mock",
  UPLOAD: "upload",
  GENERATED: "generated",
});

export const SOURCE_TYPES = Object.freeze(Object.values(SOURCE_TYPE));

export const STORAGE_PROVIDER = Object.freeze({
  S3: "s3",
});

export const STORAGE_PROVIDERS = Object.freeze(Object.values(STORAGE_PROVIDER));

export const DOCUMENT_STATUS = Object.freeze({
  UPLOADED: "uploaded",
  EXTRACTING: "extracting",
  OPTIMIZING: "optimizing",
  CHUNKING: "chunking",
  EMBEDDING: "embedding",
  READY: "ready",
  FAILED: "failed",
});

export const DOCUMENT_STATUSES = Object.freeze(Object.values(DOCUMENT_STATUS));

export const FILE_KIND = Object.freeze({
  TEXT: "text",
  MARKDOWN: "markdown",
  CSV: "csv",
  TSV: "tsv",
  PDF: "pdf",
  DOCX: "docx",
  XLSX: "xlsx",
  PPTX: "pptx",
  IMAGE: "image",
  AUDIO: "audio",
  VIDEO: "video",
});

export const FILE_KINDS = Object.freeze(Object.values(FILE_KIND));
