import { UPLOAD_ERROR_CODE } from "../../constants/upload.constants.js";
import { createHttpError } from "../../utils/httpError.js";
import { buildDemoUploadObjectKey } from "../storage/s3ObjectKeys.js";
import { putObject } from "../storage/s3Storage.service.js";

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
