import { createHttpError } from "../../utils/httpError.js";

export function createStorageNotConfiguredError() {
  return createHttpError(
    503,
    "S3 storage is not configured for downloads.",
    "STORAGE_NOT_CONFIGURED",
  );
}

export function createInvalidStorageKeyError(message = "Storage object key is not safe.") {
  return createHttpError(400, message, "INVALID_STORAGE_KEY");
}

export function createStorageMethodNotImplementedError(methodName) {
  return createHttpError(
    501,
    `${methodName} is reserved for a later storage implementation phase.`,
    "STORAGE_METHOD_NOT_IMPLEMENTED",
  );
}

export function createStorageReadFailedError(message = "Stored object could not be read.") {
  return createHttpError(503, message, "STORAGE_READ_FAILED");
}

export function createStorageObjectNotFoundError() {
  return createHttpError(404, "Stored object was not found.", "STORAGE_OBJECT_NOT_FOUND");
}
