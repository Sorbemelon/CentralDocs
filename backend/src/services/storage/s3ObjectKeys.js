import {
  MAX_SAFE_FILENAME_LENGTH,
  MOCK_WORKSPACE_ID,
  STORAGE_KEY_PREFIX,
} from "./storage.constants.js";
import { createInvalidStorageKeyError } from "./storageErrors.js";

function rejectUnsafePathPart(value, label) {
  const text = String(value || "").trim();

  if (!text) {
    throw createInvalidStorageKeyError(`${label} is required for an S3 object key.`);
  }
  if (text.includes("..") || text.includes("/") || text.includes("\\") || text.startsWith("/")) {
    throw createInvalidStorageKeyError(`${label} contains unsafe path characters.`);
  }

  return text;
}

function sanitizeKeySegment(value, label) {
  const text = rejectUnsafePathPart(value, label);
  const sanitized = text
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!sanitized) {
    throw createInvalidStorageKeyError(`${label} is empty after sanitization.`);
  }

  return sanitized;
}

function limitFilenameLength(filename) {
  if (filename.length <= MAX_SAFE_FILENAME_LENGTH) {
    return filename;
  }

  const lastDot = filename.lastIndexOf(".");
  const hasSafeExtension = lastDot > 0 && lastDot < filename.length - 1;
  if (!hasSafeExtension) {
    return filename.slice(0, MAX_SAFE_FILENAME_LENGTH);
  }

  const extension = filename.slice(lastDot);
  const base = filename.slice(0, lastDot);
  const baseLength = Math.max(1, MAX_SAFE_FILENAME_LENGTH - extension.length);

  return `${base.slice(0, baseLength)}${extension}`;
}

export function sanitizeFilename(filename) {
  const text = rejectUnsafePathPart(filename, "Filename");
  const sanitized = text
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^\.+/, "");

  if (!sanitized || sanitized === "." || sanitized === "..") {
    throw createInvalidStorageKeyError("Filename is empty after sanitization.");
  }

  return limitFilenameLength(sanitized);
}

export function isSafeObjectKey(key) {
  if (typeof key !== "string") {
    return false;
  }

  const trimmed = key.trim();
  if (!trimmed || trimmed !== key || trimmed.startsWith("/") || trimmed.includes("\\")) {
    return false;
  }
  if (trimmed.includes("..")) {
    return false;
  }

  const segments = trimmed.split("/");
  return segments.every((segment) => Boolean(segment) && segment !== "." && segment !== "..");
}

export function assertSafeObjectKey(key) {
  if (!isSafeObjectKey(key)) {
    throw createInvalidStorageKeyError();
  }

  return key;
}

export function buildMockObjectKey({
  workspaceId = MOCK_WORKSPACE_ID,
  documentId,
  filename,
} = {}) {
  const key = [
    STORAGE_KEY_PREFIX.MOCK,
    sanitizeKeySegment(workspaceId, "Workspace ID"),
    "original",
    sanitizeKeySegment(documentId, "Document ID"),
    sanitizeFilename(filename),
  ].join("/");

  return assertSafeObjectKey(key);
}

export function buildDemoUploadObjectKey({ demoSessionId, documentId, filename } = {}) {
  const key = [
    STORAGE_KEY_PREFIX.DEMO_SESSIONS,
    sanitizeKeySegment(demoSessionId, "Demo session ID"),
    "uploads",
    sanitizeKeySegment(documentId, "Document ID"),
    sanitizeFilename(filename),
  ].join("/");

  return assertSafeObjectKey(key);
}

export function buildGeneratedDocumentObjectKey({ demoSessionId, documentId, filename } = {}) {
  const key = [
    STORAGE_KEY_PREFIX.DEMO_SESSIONS,
    sanitizeKeySegment(demoSessionId, "Demo session ID"),
    "generated",
    sanitizeKeySegment(documentId, "Document ID"),
    sanitizeFilename(filename),
  ].join("/");

  return assertSafeObjectKey(key);
}
