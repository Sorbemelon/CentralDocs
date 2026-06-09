import path from "node:path";
import {
  PUBLIC_UPLOAD_FILE_KIND_TO_EXTENSION,
  UPLOAD_ERROR_CODE,
  UPLOAD_LIMITS,
} from "../../constants/upload.constants.js";
import { createHttpError } from "../../utils/httpError.js";
import { sanitizeFilename } from "../storage/s3ObjectKeys.js";

const PATH_SEPARATOR_PATTERN = /[\\/]/;

function rejectUnsafeFilename(filename) {
  const raw = String(filename || "").trim();
  if (!raw || raw.includes("..") || PATH_SEPARATOR_PATTERN.test(raw) || path.basename(raw) !== raw) {
    throw createHttpError(
      400,
      "Upload filename must not contain path segments.",
      UPLOAD_ERROR_CODE.UNSUPPORTED_FILE_TYPE,
    );
  }

  return raw;
}

function capWithExtension(filename, maxLength = UPLOAD_LIMITS.maxFilenameLength) {
  if (filename.length <= maxLength) {
    return filename;
  }

  const extension = path.extname(filename);
  const basename = path.basename(filename, extension);
  const basenameLimit = Math.max(1, maxLength - extension.length);
  return `${basename.slice(0, basenameLimit)}${extension}`;
}

function titleFromFilename(filename) {
  return path
    .basename(filename, path.extname(filename))
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Uploaded document";
}

function sanitizeTitle(title, fallbackTitle) {
  const raw = String(title || "").trim();
  const value = raw || fallbackTitle;
  const sanitized = value
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (sanitized || fallbackTitle).slice(0, UPLOAD_LIMITS.maxTitleLength);
}

export function normalizeUploadFilename({
  originalFilename,
  fileKind,
  title = null,
} = {}) {
  const raw = rejectUnsafeFilename(originalFilename);
  const expectedExtension = PUBLIC_UPLOAD_FILE_KIND_TO_EXTENSION[fileKind];
  const extension = path.extname(raw).replace(".", "").toLowerCase();

  if (!expectedExtension || extension !== expectedExtension) {
    throw createHttpError(
      400,
      "Upload filename extension does not match the validated file type.",
      UPLOAD_ERROR_CODE.UNSUPPORTED_FILE_TYPE,
    );
  }

  const basename = path.basename(raw, path.extname(raw));
  if (!basename.trim()) {
    throw createHttpError(
      400,
      "Upload filename must include a name.",
      UPLOAD_ERROR_CODE.UNSUPPORTED_FILE_TYPE,
    );
  }

  const safeFilename = capWithExtension(sanitizeFilename(raw));
  const fallbackTitle = titleFromFilename(safeFilename);

  return {
    originalFilename: raw,
    downloadFilename: safeFilename,
    title: sanitizeTitle(title, fallbackTitle),
    fileExtension: expectedExtension,
  };
}
