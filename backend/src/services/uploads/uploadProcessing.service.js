import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { nanoid } from "nanoid";
import {
  DOCUMENT_STATUS,
} from "../../constants/document.constants.js";
import { EXTRACTION_SOURCE } from "../../constants/extraction.constants.js";
import { UPLOAD_ERROR_CODE } from "../../constants/upload.constants.js";
import { createHttpError, HttpError } from "../../utils/httpError.js";
import { extractFile } from "../extraction/extractionRegistry.service.js";
import { indexDocumentFromExtraction } from "../indexing/documentIndexing.service.js";
import {
  markExtracting,
  markFailed,
  markReady,
} from "../indexing/documentIndexingStatus.service.js";

const SECRETISH_PATTERN = /(api[_-]?key|secret|token|password)\s*[:=]\s*[^\s,;]+/gi;
const WINDOWS_PATH_PATTERN = /[A-Za-z]:\\[^\s"'<>]+/g;
const POSIX_ABSOLUTE_PATH_PATTERN = /\/(?:Users|home|tmp|var|etc|mnt)\/[^\s"'<>]+/g;

function sanitizeFailureMessage(message = "Document processing failed.") {
  return String(message || "Document processing failed.")
    .replace(SECRETISH_PATTERN, "$1=[redacted]")
    .replace(WINDOWS_PATH_PATTERN, "[local-path]")
    .replace(POSIX_ABSOLUTE_PATH_PATTERN, "[local-path]")
    .slice(0, 500);
}

function toProcessingError(error) {
  if (error instanceof HttpError) {
    return error;
  }

  return createHttpError(
    500,
    "Uploaded document processing failed.",
    UPLOAD_ERROR_CODE.PROCESSING_FAILED,
  );
}

async function withTemporaryUploadFile({ buffer, filename, run }) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "centraldocs-upload-"));
  const tempPath = path.join(tempDir, `${nanoid(8)}-${filename}`);

  try {
    await fs.writeFile(tempPath, buffer);
    return await run(tempPath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function getDocumentId(document = {}) {
  return String(document._id || document.id || document.documentId || "");
}

async function updateStatus({
  repository,
  documentId,
  demoSessionId,
  patch,
  statusSequence,
} = {}) {
  if (patch.status) {
    statusSequence.push(patch.status);
  }

  return repository.updateUploadDocumentStatus?.({
    documentId,
    demoSessionId,
    patch,
  });
}

function buildIndexingRepositories({ repository, demoSessionId }) {
  return {
    documentRepository: {
      updateDocumentIndexingStatus: ({ documentId, patch }) =>
        repository.updateUploadDocumentStatus({ documentId, demoSessionId, patch }),
    },
  };
}

export async function processUploadedDocument({
  document,
  uploadFile,
  repository,
  extractor = extractFile,
  indexer = indexDocumentFromExtraction,
  embedder,
  indexingRepositories = null,
  options = {},
} = {}) {
  const documentId = getDocumentId(document);
  const demoSessionId = document?.demoSessionId;
  const statusSequence = [DOCUMENT_STATUS.UPLOADED];

  try {
    await updateStatus({
      repository,
      documentId,
      demoSessionId,
      patch: markExtracting(),
      statusSequence,
    });

    const extractionResult = await withTemporaryUploadFile({
      buffer: uploadFile.buffer,
      filename: uploadFile.filenameMeta.downloadFilename,
      run: (filePath) =>
        extractor({
          filePath,
          originalFilename: uploadFile.filenameMeta.downloadFilename,
          mimeType: uploadFile.validation.mimeType,
          fileKind: uploadFile.validation.fileKind,
          source: EXTRACTION_SOURCE.PUBLIC_UPLOAD,
          document,
        }),
    });
    const indexing = await indexer({
      document,
      extractionResult,
      embedder,
      repositories:
        indexingRepositories ||
        buildIndexingRepositories({
          repository,
          demoSessionId,
        }),
      options: {
        reindex: true,
        ...options,
      },
    });
    const contentStats = indexing.contentStats || {
      extractedCharCount: extractionResult.stats?.extractedCharCount || 0,
      optimizedCharCount: extractionResult.stats?.optimizedCharCount || 0,
      estimatedTokenCount: extractionResult.stats?.estimatedTokenCount || 0,
      chunkCount: indexing.chunkCount || 0,
    };
    const readyPatch = markReady({ contentStats });
    const finalDocument =
      (await updateStatus({
        repository,
        documentId,
        demoSessionId,
        patch: {
          ...readyPatch,
          extractedTextPreview: extractionResult.textPreview,
        },
        statusSequence,
      })) ||
      {
        ...document,
        ...readyPatch,
        extractedTextPreview: extractionResult.textPreview,
      };

    const orderedStatusSequence = [
      DOCUMENT_STATUS.UPLOADED,
      DOCUMENT_STATUS.EXTRACTING,
      ...(indexing.statusSequence || []).filter(
        (status) => ![DOCUMENT_STATUS.EXTRACTING, DOCUMENT_STATUS.READY].includes(status),
      ),
      DOCUMENT_STATUS.READY,
    ];

    return {
      status: "completed",
      document: finalDocument,
      extractionResult,
      indexing,
      statusSequence: [...new Set(orderedStatusSequence)],
      warnings: [...(extractionResult.warnings || []), ...(indexing.warnings || [])],
    };
  } catch (error) {
    const safeError = toProcessingError(error);
    const failedPatch = markFailed({
      error: {
        message: sanitizeFailureMessage(safeError.message),
      },
    });
    const failedDocument =
      (await updateStatus({
        repository,
        documentId,
        demoSessionId,
        patch: failedPatch,
        statusSequence,
      })) ||
      {
        ...document,
        ...failedPatch,
      };

    return {
      status: "failed",
      document: failedDocument,
      extractionResult: null,
      indexing: null,
      statusSequence: [...new Set([...statusSequence, DOCUMENT_STATUS.FAILED])],
      warnings: [
        {
          code: UPLOAD_ERROR_CODE.PROCESSING_FAILED,
          message: "Uploaded document was saved, but processing did not complete.",
          reason: safeError.code || UPLOAD_ERROR_CODE.PROCESSING_FAILED,
        },
      ],
    };
  }
}
