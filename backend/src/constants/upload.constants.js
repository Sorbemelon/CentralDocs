export const UPLOAD_ERROR_CODE = Object.freeze({
  FILE_REQUIRED: "UPLOAD_FILE_REQUIRED",
  TOO_MANY_FILES: "UPLOAD_TOO_MANY_FILES",
  UNSUPPORTED_FILE_TYPE: "UPLOAD_UNSUPPORTED_FILE_TYPE",
  FILE_TOO_LARGE: "UPLOAD_FILE_TOO_LARGE",
  EMPTY_FILE: "UPLOAD_EMPTY_FILE",
  FOLDER_NOT_FOUND: "UPLOAD_FOLDER_NOT_FOUND",
  FOLDER_NOT_ALLOWED: "UPLOAD_FOLDER_NOT_ALLOWED",
  STORAGE_NOT_CONFIGURED: "UPLOAD_STORAGE_NOT_CONFIGURED",
  SAVE_FAILED: "UPLOAD_SAVE_FAILED",
  PROCESSING_FAILED: "DOCUMENT_PROCESSING_FAILED",
  PERSISTENCE_NOT_CONFIGURED: "PERSISTENCE_NOT_CONFIGURED",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  DEMO_UPLOAD_LIMIT_REACHED: "DEMO_UPLOAD_LIMIT_REACHED",
  DEMO_STORAGE_LIMIT_REACHED: "DEMO_STORAGE_LIMIT_REACHED",
  DOCUMENT_NOT_FOUND: "DOCUMENT_NOT_FOUND",
  DOCUMENT_TRASHED: "DOCUMENT_TRASHED",
  DOCUMENT_RETRY_NOT_ALLOWED: "DOCUMENT_RETRY_NOT_ALLOWED",
  DOCUMENT_RETRY_UNSUPPORTED_SOURCE: "DOCUMENT_RETRY_UNSUPPORTED_SOURCE",
  RETRY_NOT_AVAILABLE: "RETRY_NOT_AVAILABLE",
  ORPHAN_CLEANUP_FAILED: "UPLOAD_ORPHAN_CLEANUP_FAILED",
  INVALID_REQUEST: "INVALID_REQUEST",
});

export const PUBLIC_UPLOAD_EXTENSION_TO_KIND = Object.freeze({
  ".txt": "text",
  ".md": "markdown",
  ".csv": "csv",
  ".tsv": "tsv",
  ".pdf": "pdf",
  ".docx": "docx",
});

export const PUBLIC_UPLOAD_FILE_KIND_TO_EXTENSION = Object.freeze({
  text: "txt",
  markdown: "md",
  csv: "csv",
  tsv: "tsv",
  pdf: "pdf",
  docx: "docx",
});

export const PUBLIC_UPLOAD_SIZE_LIMIT_BYTES = Object.freeze({
  text: 500 * 1024,
  markdown: 500 * 1024,
  csv: 500 * 1024,
  tsv: 500 * 1024,
  pdf: 2 * 1024 * 1024,
  docx: 1024 * 1024,
});

export const PUBLIC_UPLOAD_MIME_TYPE = Object.freeze({
  text: "text/plain",
  markdown: "text/markdown",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
});

export const PUBLIC_UPLOAD_ALLOWED_MIME_TYPES = Object.freeze({
  text: ["text/plain", "application/octet-stream"],
  markdown: ["text/markdown", "text/plain", "application/octet-stream"],
  csv: ["text/csv", "application/csv", "text/plain", "application/vnd.ms-excel", "application/octet-stream"],
  tsv: ["text/tab-separated-values", "text/plain", "application/octet-stream"],
  pdf: ["application/pdf", "application/octet-stream"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/octet-stream",
  ],
});

export const UPLOAD_LIMITS = Object.freeze({
  maxFilesPerRequest: 1,
  maxMultipartFileBytes: 2 * 1024 * 1024,
  maxFilenameLength: 120,
  maxTitleLength: 160,
});
