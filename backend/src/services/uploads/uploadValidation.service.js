import path from "node:path";
import { lookup as lookupMimeType } from "mime-types";
import {
  PUBLIC_UPLOAD_ALLOWED_MIME_TYPES,
  PUBLIC_UPLOAD_EXTENSION_TO_KIND,
  PUBLIC_UPLOAD_MIME_TYPE,
  PUBLIC_UPLOAD_SIZE_LIMIT_BYTES,
  UPLOAD_ERROR_CODE,
} from "../../constants/upload.constants.js";
import { createHttpError } from "../../utils/httpError.js";
import { getFileKindFromFilename } from "../extraction/extractionTypes.service.js";

const BINARY_DISALLOWED_EXTENSIONS = new Set([
  ".xlsx",
  ".pptx",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".mp3",
  ".wav",
  ".mp4",
  ".mov",
  ".zip",
  ".rar",
  ".7z",
  ".exe",
  ".dll",
  ".bat",
  ".cmd",
  ".sh",
]);

function createUnsupportedTypeError(details = {}) {
  return createHttpError(
    400,
    "This file type is not supported for public upload.",
    UPLOAD_ERROR_CODE.UNSUPPORTED_FILE_TYPE,
    details,
  );
}

function asBuffer(buffer) {
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || "");
}

function getExtension(filename = "") {
  return path.extname(String(filename || "")).toLowerCase();
}

function assertMimeCompatible({ fileKind, mimeType }) {
  const safeMime = String(mimeType || "").toLowerCase() || "application/octet-stream";
  const allowed = PUBLIC_UPLOAD_ALLOWED_MIME_TYPES[fileKind] || [];
  if (!allowed.includes(safeMime)) {
    throw createUnsupportedTypeError({ fileKind, mimeType: safeMime });
  }
}

function assertNotBinaryText(buffer, fileKind) {
  if (!["text", "markdown", "csv", "tsv"].includes(fileKind)) {
    return;
  }
  if (buffer.includes(0)) {
    throw createUnsupportedTypeError({ fileKind, reason: "binary_text" });
  }
}

function assertPdfSignature(buffer) {
  if (!buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throw createUnsupportedTypeError({ fileKind: "pdf", reason: "pdf_signature" });
  }
}

function assertDocxSignature(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw createUnsupportedTypeError({ fileKind: "docx", reason: "docx_signature" });
  }
}

function assertContentSignature(buffer, fileKind) {
  if (fileKind === "pdf") {
    assertPdfSignature(buffer);
  }
  if (fileKind === "docx") {
    assertDocxSignature(buffer);
  }
  assertNotBinaryText(buffer, fileKind);
}

export function validateUploadFile(file = {}) {
  if (!file || !file.originalname) {
    throw createHttpError(
      400,
      "A single upload file is required.",
      UPLOAD_ERROR_CODE.FILE_REQUIRED,
    );
  }

  const buffer = asBuffer(file.buffer);
  if (buffer.length === 0) {
    throw createHttpError(
      400,
      "Uploaded file is empty.",
      UPLOAD_ERROR_CODE.EMPTY_FILE,
    );
  }

  const extension = getExtension(file.originalname);
  if (BINARY_DISALLOWED_EXTENSIONS.has(extension) || !PUBLIC_UPLOAD_EXTENSION_TO_KIND[extension]) {
    throw createUnsupportedTypeError({ extension });
  }

  const fileKind = PUBLIC_UPLOAD_EXTENSION_TO_KIND[extension];
  const extractionKind = getFileKindFromFilename(file.originalname, file.mimetype);
  if (extractionKind && extractionKind !== fileKind) {
    throw createUnsupportedTypeError({ fileKind, detectedKind: extractionKind });
  }

  assertMimeCompatible({ fileKind, mimeType: file.mimetype || lookupMimeType(file.originalname) });

  const maxSizeBytes = PUBLIC_UPLOAD_SIZE_LIMIT_BYTES[fileKind];
  if (buffer.length > maxSizeBytes) {
    throw createHttpError(
      413,
      "Uploaded file exceeds the public demo size limit.",
      UPLOAD_ERROR_CODE.FILE_TOO_LARGE,
      { fileKind, maxSizeBytes },
    );
  }

  assertContentSignature(buffer, fileKind);

  return {
    originalFilename: file.originalname,
    sizeBytes: buffer.length,
    buffer,
    fileKind,
    fileExtension: extension.replace(".", ""),
    mimeType: PUBLIC_UPLOAD_MIME_TYPE[fileKind],
    contentType: PUBLIC_UPLOAD_MIME_TYPE[fileKind],
    maxSizeBytes,
  };
}

export function validateUploadFiles(files = []) {
  const normalizedFiles = Array.isArray(files) ? files : files ? [files] : [];
  if (normalizedFiles.length === 0) {
    throw createHttpError(
      400,
      "A single upload file is required.",
      UPLOAD_ERROR_CODE.FILE_REQUIRED,
    );
  }
  if (normalizedFiles.length > 1) {
    throw createHttpError(
      400,
      "Only one file can be uploaded at a time.",
      UPLOAD_ERROR_CODE.TOO_MANY_FILES,
    );
  }

  return validateUploadFile(normalizedFiles[0]);
}
