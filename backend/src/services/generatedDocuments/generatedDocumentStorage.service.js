import { createHttpError } from "../../utils/httpError.js";
import { buildGeneratedDocumentObjectKey } from "../storage/s3ObjectKeys.js";
import { putObject } from "../storage/s3Storage.service.js";
import {
  GENERATED_DOCUMENT_ERROR_CODE,
} from "../../constants/generatedDocument.constants.js";

export async function saveGeneratedDocumentObject({
  demoSessionId,
  documentId,
  filename,
  content,
  contentType,
  storage = { putObject },
} = {}) {
  const objectKey = buildGeneratedDocumentObjectKey({
    demoSessionId,
    documentId,
    filename,
  });

  try {
    const result = await storage.putObject({
      objectKey,
      body: Buffer.from(String(content || ""), "utf8"),
      contentType,
    });

    return {
      objectKey,
      storageProvider: "s3",
      etag: result?.etag || null,
      bucketConfigured: Boolean(result?.bucketConfigured),
    };
  } catch (error) {
    if (error?.code === GENERATED_DOCUMENT_ERROR_CODE.STORAGE_NOT_CONFIGURED) {
      throw error;
    }
    throw createHttpError(
      error?.statusCode || 503,
      error?.message || "Generated document could not be saved to storage.",
      error?.code || GENERATED_DOCUMENT_ERROR_CODE.SAVE_FAILED,
    );
  }
}
