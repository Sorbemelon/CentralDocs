import path from "node:path";
import { lookup as lookupMimeType } from "mime-types";
import {
  EXTRACTION_ERROR_CODE,
  EXTRACTION_FILE_KIND,
  EXTRACTION_SOURCE,
  MOCK_ONLY_EXTRACTION_FILE_KINDS,
  PUBLIC_UPLOAD_EXTRACTION_FILE_KINDS,
  SUPPORTED_EXTRACTION_FILE_KINDS,
} from "../../constants/extraction.constants.js";
import { createHttpError } from "../../utils/httpError.js";

const EXTENSION_TO_KIND = Object.freeze({
  ".txt": EXTRACTION_FILE_KIND.TEXT,
  ".md": EXTRACTION_FILE_KIND.MARKDOWN,
  ".markdown": EXTRACTION_FILE_KIND.MARKDOWN,
  ".csv": EXTRACTION_FILE_KIND.CSV,
  ".tsv": EXTRACTION_FILE_KIND.TSV,
  ".pdf": EXTRACTION_FILE_KIND.PDF,
  ".docx": EXTRACTION_FILE_KIND.DOCX,
  ".xlsx": EXTRACTION_FILE_KIND.XLSX,
  ".pptx": EXTRACTION_FILE_KIND.PPTX,
  ".png": EXTRACTION_FILE_KIND.IMAGE,
  ".jpg": EXTRACTION_FILE_KIND.IMAGE,
  ".jpeg": EXTRACTION_FILE_KIND.IMAGE,
  ".mp3": EXTRACTION_FILE_KIND.AUDIO,
  ".wav": EXTRACTION_FILE_KIND.AUDIO,
  ".mp4": EXTRACTION_FILE_KIND.VIDEO,
  ".mov": EXTRACTION_FILE_KIND.VIDEO,
});

const MIME_TO_KIND = Object.freeze({
  "text/plain": EXTRACTION_FILE_KIND.TEXT,
  "text/markdown": EXTRACTION_FILE_KIND.MARKDOWN,
  "text/csv": EXTRACTION_FILE_KIND.CSV,
  "text/tab-separated-values": EXTRACTION_FILE_KIND.TSV,
  "application/pdf": EXTRACTION_FILE_KIND.PDF,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    EXTRACTION_FILE_KIND.DOCX,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    EXTRACTION_FILE_KIND.XLSX,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    EXTRACTION_FILE_KIND.PPTX,
  "image/png": EXTRACTION_FILE_KIND.IMAGE,
  "image/jpeg": EXTRACTION_FILE_KIND.IMAGE,
  "audio/mpeg": EXTRACTION_FILE_KIND.AUDIO,
  "audio/wav": EXTRACTION_FILE_KIND.AUDIO,
  "audio/x-wav": EXTRACTION_FILE_KIND.AUDIO,
  "video/mp4": EXTRACTION_FILE_KIND.VIDEO,
  "video/quicktime": EXTRACTION_FILE_KIND.VIDEO,
});

export function getFileKindFromFilename(filename = "", mimeType = null) {
  const extension = path.extname(String(filename || "")).toLowerCase();
  if (EXTENSION_TO_KIND[extension]) {
    return EXTENSION_TO_KIND[extension];
  }

  const resolvedMimeType = mimeType || lookupMimeType(filename) || null;
  return MIME_TO_KIND[resolvedMimeType] || null;
}

export function isPublicUploadExtractionType(fileKind) {
  return PUBLIC_UPLOAD_EXTRACTION_FILE_KINDS.includes(fileKind);
}

export function isMockOnlyExtractionType(fileKind) {
  return MOCK_ONLY_EXTRACTION_FILE_KINDS.includes(fileKind);
}

export function isSupportedExtractionType(fileKind) {
  return SUPPORTED_EXTRACTION_FILE_KINDS.includes(fileKind);
}

export function assertSupportedExtractionType(
  fileKind,
  { source = EXTRACTION_SOURCE.PUBLIC_UPLOAD } = {},
) {
  if (!isSupportedExtractionType(fileKind)) {
    throw createHttpError(
      400,
      "This file type is not supported for extraction.",
      EXTRACTION_ERROR_CODE.UNSUPPORTED_FILE_TYPE,
      { fileKind: fileKind || null },
    );
  }

  if (source === EXTRACTION_SOURCE.PUBLIC_UPLOAD && !isPublicUploadExtractionType(fileKind)) {
    throw createHttpError(
      400,
      "This file type is not supported for public upload extraction.",
      EXTRACTION_ERROR_CODE.UNSUPPORTED_FILE_TYPE,
      { fileKind, source },
    );
  }

  return fileKind;
}

export function getSafeMimeType(filename, mimeType = null) {
  return mimeType || lookupMimeType(filename) || "application/octet-stream";
}
