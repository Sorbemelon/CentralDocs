import { UPLOAD_ERROR_CODE } from "../../constants/upload.constants.js";
import { createHttpError } from "../../utils/httpError.js";
import { assertSafeObjectKey, buildDemoUploadObjectKey } from "../storage/s3ObjectKeys.js";
import { deleteObject, getObjectBuffer, putObject } from "../storage/s3Storage.service.js";

function assertSafeUploadObjectKey(objectKey) {
  const safeObjectKey = assertSafeObjectKey(objectKey);
  if (!safeObjectKey.startsWith("demo-sessions/") || !safeObjectKey.includes("/uploads/")) {
    throw createHttpError(
      400,
      "Only uploaded demo-session objects can be accessed by upload cleanup.",
      "INVALID_STORAGE_KEY",
    );
  }

  return safeObjectKey;
}

export async function saveUploadObject({
  demoSessionId,
  documentId,
  filename,
  buffer,
  contentType,
  storage = { putObject },
} = {}) {
  const objectKey = buildDemoUploadObjectKey({
    demoSessionId,
    documentId,
    filename,
  });

  try {
    const result = await storage.putObject({
      objectKey,
      body: buffer,
      contentType,
    });

    return {
      objectKey,
      storageProvider: "s3",
      etag: result?.etag || null,
      bucketConfigured: Boolean(result?.bucketConfigured),
    };
  } catch (error) {
    if (error?.code === "STORAGE_NOT_CONFIGURED") {
      throw createHttpError(
        503,
        "Upload storage is not configured.",
        UPLOAD_ERROR_CODE.STORAGE_NOT_CONFIGURED,
      );
    }
    throw createHttpError(
      error?.statusCode || 503,
      "Uploaded file could not be saved to storage.",
      error?.code || UPLOAD_ERROR_CODE.SAVE_FAILED,
    );
  }
}

export async function readUploadedObjectBuffer({
  objectKey,
  storage = { getObjectBuffer },
} = {}) {
  const safeObjectKey = assertSafeUploadObjectKey(objectKey);

  try {
    return await storage.getObjectBuffer({ objectKey: safeObjectKey });
  } catch (error) {
    if (error?.code === "STORAGE_NOT_CONFIGURED") {
      throw createHttpError(503, "Upload storage is not configured.", "STORAGE_NOT_CONFIGURED");
    }
    if (error?.code === "STORAGE_OBJECT_NOT_FOUND") {
      throw createHttpError(404, "Uploaded original file was not found.", "STORAGE_OBJECT_NOT_FOUND");
    }
    throw createHttpError(
      error?.statusCode || 503,
      "Uploaded original file could not be read from storage.",
      error?.code || "STORAGE_READ_FAILED",
    );
  }
}

export async function deleteUploadedObject({
  objectKey,
  storage = { deleteObject },
} = {}) {
  const safeObjectKey = assertSafeUploadObjectKey(objectKey);

  try {
    return await storage.deleteObject({ objectKey: safeObjectKey });
  } catch (error) {
    if (error?.code === "STORAGE_NOT_CONFIGURED") {
      throw createHttpError(503, "Upload storage is not configured.", "STORAGE_NOT_CONFIGURED");
    }
    throw createHttpError(
      error?.statusCode || 503,
      "Uploaded object cleanup failed.",
      error?.code || UPLOAD_ERROR_CODE.ORPHAN_CLEANUP_FAILED,
    );
  }
}
