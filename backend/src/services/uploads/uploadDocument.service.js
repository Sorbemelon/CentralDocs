import { DEMO_LIMITS, EMPTY_DEMO_USAGE } from "../../config/limits.js";
import {
  DOCUMENT_SCOPE,
  DOCUMENT_STATUS,
  SOURCE_TYPE,
} from "../../constants/document.constants.js";
import { LIFECYCLE_STATUS } from "../../constants/lifecycle.constants.js";
import { UPLOAD_ERROR_CODE } from "../../constants/upload.constants.js";
import { isMockFolderId } from "../../utils/ids.js";
import { createHttpError } from "../../utils/httpError.js";
import {
  applyUsageDelta,
  getRemainingLimits,
  getUsageSnapshot,
} from "../demo/demoUsage.service.js";
import {
  applyDemoSessionUsageDelta,
  getDemoSession,
} from "../demo/demoSession.service.js";
import { toDocumentDto } from "../documents/document.dto.js";
import { validateUploadFiles } from "./uploadValidation.service.js";
import { normalizeUploadFilename } from "./uploadFilename.service.js";
import {
  deleteUploadedObject,
  readUploadedObjectBuffer,
  saveUploadObject,
} from "./uploadStorage.service.js";
import {
  buildUploadDocumentPayload,
  createUploadDocumentId,
  createUploadDocumentRecord,
  findUploadDocumentById,
  findUploadFolderById,
  isFolderAllowedForUpload,
  updateUploadDocumentStatus,
} from "./uploadDocument.repository.js";
import { processUploadedDocument } from "./uploadProcessing.service.js";
import { toDocumentStatusDto, toUploadResultDto } from "./uploadResult.dto.js";

const defaultRepository = Object.freeze({
  createDocumentId: createUploadDocumentId,
  findUploadFolderById,
  createUploadDocumentRecord,
  updateUploadDocumentStatus,
  findUploadDocumentById,
});

const defaultDependencies = Object.freeze({
  repository: defaultRepository,
  fileValidator: validateUploadFiles,
  filenameNormalizer: normalizeUploadFilename,
  storageSaver: saveUploadObject,
  storageCleaner: deleteUploadedObject,
  storageReader: readUploadedObjectBuffer,
  processor: processUploadedDocument,
  demoSessionReader: getDemoSession,
  demoSessionUsageUpdater: applyDemoSessionUsageDelta,
  payloadBuilder: buildUploadDocumentPayload,
});

let uploadDocumentTestDependencies = {};

function getDependencies(overrides = {}) {
  return {
    ...defaultDependencies,
    ...uploadDocumentTestDependencies,
    ...overrides,
  };
}

export function setUploadDocumentDependenciesForTests(overrides = {}) {
  uploadDocumentTestDependencies = overrides;
}

export function resetUploadDocumentDependenciesForTests() {
  uploadDocumentTestDependencies = {};
}

function requireDemoSessionId(demoSessionId) {
  if (!demoSessionId) {
    throw createHttpError(
      401,
      "An active demo session is required for uploads.",
      UPLOAD_ERROR_CODE.SESSION_NOT_FOUND,
    );
  }

  return demoSessionId;
}

async function getUsageSession({ deps, demoSessionId } = {}) {
  const session = await deps.demoSessionReader(demoSessionId);
  if (!session) {
    throw createHttpError(
      401,
      "An active demo session is required for uploads.",
      UPLOAD_ERROR_CODE.SESSION_NOT_FOUND,
    );
  }

  return {
    ...session,
    usage: getUsageSnapshot(session || { usage: EMPTY_DEMO_USAGE }),
  };
}

function assertUploadUsageAvailable(usageSession, sizeBytes) {
  const usage = getUsageSnapshot(usageSession);
  if (usage.uploadedFiles >= DEMO_LIMITS.maxUploadedFiles) {
    throw createHttpError(
      409,
      "The demo upload limit has been reached.",
      UPLOAD_ERROR_CODE.DEMO_UPLOAD_LIMIT_REACHED,
    );
  }
  if (usage.storageBytes + sizeBytes > DEMO_LIMITS.maxStorageBytes) {
    throw createHttpError(
      409,
      "The demo storage limit has been reached.",
      UPLOAD_ERROR_CODE.DEMO_STORAGE_LIMIT_REACHED,
    );
  }
}

async function resolveUploadFolder({ deps, folderId, demoSessionId } = {}) {
  const normalizedFolderId = String(folderId || "").trim();
  if (!normalizedFolderId) {
    return null;
  }
  if (isMockFolderId(normalizedFolderId)) {
    throw createHttpError(
      400,
      "Uploads cannot be saved into read-only mock folders.",
      UPLOAD_ERROR_CODE.FOLDER_NOT_ALLOWED,
    );
  }

  const folder = await deps.repository.findUploadFolderById({
    folderId: normalizedFolderId,
    demoSessionId,
  });
  if (!folder) {
    throw createHttpError(
      404,
      "Upload folder was not found.",
      UPLOAD_ERROR_CODE.FOLDER_NOT_FOUND,
    );
  }
  if (!isFolderAllowedForUpload(folder, demoSessionId)) {
    throw createHttpError(
      400,
      "Upload folder is not available for user uploads.",
      UPLOAD_ERROR_CODE.FOLDER_NOT_ALLOWED,
    );
  }

  return folder;
}

async function updateUploadUsage({ deps, demoSessionId, usageSession, sizeBytes } = {}) {
  const delta = { uploadedFiles: 1, storageBytes: sizeBytes };
  return (
    (await deps.demoSessionUsageUpdater(demoSessionId, delta)) ||
    applyUsageDelta(usageSession, delta)
  );
}

function assertDocumentFound(document) {
  if (!document) {
    throw createHttpError(
      404,
      "Document was not found.",
      UPLOAD_ERROR_CODE.DOCUMENT_NOT_FOUND,
    );
  }

  return document;
}

function assertRetryCandidate(document = {}) {
  if (document.lifecycleStatus === LIFECYCLE_STATUS.TRASHED) {
    throw createHttpError(
      409,
      "Trashed documents cannot be retried.",
      UPLOAD_ERROR_CODE.DOCUMENT_TRASHED,
    );
  }
  if (
    document.scope === DOCUMENT_SCOPE.MOCK ||
    document.readOnly ||
    document.scope !== DOCUMENT_SCOPE.USER ||
    document.sourceType !== SOURCE_TYPE.UPLOAD
  ) {
    throw createHttpError(
      409,
      "Only user uploaded documents can be retried.",
      UPLOAD_ERROR_CODE.DOCUMENT_RETRY_UNSUPPORTED_SOURCE,
    );
  }
  if (document.storageProvider !== "s3" || !document.objectKey) {
    throw createHttpError(
      409,
      "This uploaded document does not have a readable original file.",
      UPLOAD_ERROR_CODE.DOCUMENT_RETRY_NOT_ALLOWED,
    );
  }
}

function assertRetryStatusAllowed(document = {}, { force = false } = {}) {
  if ([DOCUMENT_STATUS.FAILED, DOCUMENT_STATUS.UPLOADED].includes(document.status)) {
    return;
  }
  if (force && document.status === DOCUMENT_STATUS.READY) {
    return;
  }

  if (document.status === DOCUMENT_STATUS.READY) {
    throw createHttpError(
      409,
      "Ready upload documents require force=true before retrying.",
      UPLOAD_ERROR_CODE.DOCUMENT_RETRY_NOT_ALLOWED,
    );
  }

  throw createHttpError(
    409,
    "This document is not in a retryable processing state.",
    UPLOAD_ERROR_CODE.DOCUMENT_RETRY_NOT_ALLOWED,
  );
}

function buildStoredUploadFile(document = {}, buffer) {
  const originalFilename = document.originalFilename || document.downloadFilename;
  return {
    originalname: originalFilename,
    mimetype: document.mimeType,
    buffer,
    size: buffer.length,
  };
}

function buildRetryFilenameMeta(document = {}) {
  return {
    originalFilename: document.originalFilename || document.downloadFilename,
    downloadFilename: document.downloadFilename || document.originalFilename,
    title: document.title || document.downloadFilename || document.originalFilename,
    fileExtension: document.fileExtension,
  };
}

function toSafeRetryProcessing(processing = {}, document = {}) {
  return {
    status: processing.status || null,
    statusSequence: processing.statusSequence || [],
    indexed: Boolean(processing.indexing),
    statusMessage: (processing.document || document)?.statusMessage || null,
    warnings: processing.warnings || [],
  };
}

async function createUploadDocumentWithCleanup({ deps, payload, storageResult } = {}) {
  try {
    return await deps.repository.createUploadDocumentRecord(payload);
  } catch (error) {
    try {
      await deps.storageCleaner({
        objectKey: storageResult.objectKey,
        storage: deps.storage,
      });
    } catch (cleanupError) {
      throw createHttpError(
        503,
        "Upload metadata could not be saved and uploaded object cleanup failed.",
        UPLOAD_ERROR_CODE.ORPHAN_CLEANUP_FAILED,
        {
          cleanupCode: cleanupError?.code || "UPLOAD_ORPHAN_CLEANUP_FAILED",
        },
      );
    }

    throw createHttpError(
      error?.statusCode || 503,
      "Uploaded file could not be saved as a CentralDocs document.",
      UPLOAD_ERROR_CODE.SAVE_FAILED,
    );
  }
}

export async function uploadDocumentForDemo({
  demoSessionId,
  files = [],
  body = {},
  dependencies = {},
} = {}) {
  requireDemoSessionId(demoSessionId);
  const deps = getDependencies(dependencies);
  const validation = deps.fileValidator(files);
  const usageSession = await getUsageSession({ deps, demoSessionId });
  assertUploadUsageAvailable(usageSession, validation.sizeBytes);
  const folder = await resolveUploadFolder({
    deps,
    folderId: body.folderId,
    demoSessionId,
  });
  const filenameMeta = deps.filenameNormalizer({
    originalFilename: validation.originalFilename,
    fileKind: validation.fileKind,
    title: body.title,
  });
  const documentId = deps.repository.createDocumentId?.() || createUploadDocumentId();
  const storageResult = await deps.storageSaver({
    demoSessionId,
    documentId,
    filename: filenameMeta.downloadFilename,
    buffer: validation.buffer,
    contentType: validation.contentType,
    storage: deps.storage,
  });
  const payload = deps.payloadBuilder({
    documentId,
    demoSessionId,
    folderId: folder?._id || folder?.id || null,
    filenameMeta,
    validation,
    objectKey: storageResult.objectKey,
    expiresAt: usageSession.expiresAt || null,
  });
  const document = await createUploadDocumentWithCleanup({
    deps,
    payload,
    storageResult,
  });
  const updatedSession = await updateUploadUsage({
    deps,
    demoSessionId,
    usageSession,
    sizeBytes: validation.sizeBytes,
  });
  const processing = await deps.processor({
    document,
    uploadFile: {
      validation,
      filenameMeta,
      buffer: validation.buffer,
    },
    repository: deps.repository,
    extractor: deps.extractor,
    indexer: deps.indexer,
    embedder: deps.embedder,
    indexingRepositories: deps.indexingRepositories,
    options: deps.processingOptions || {},
  });

  return toUploadResultDto({
    document: processing.document || document,
    processing,
    usage: getUsageSnapshot(updatedSession),
    remaining: getRemainingLimits(updatedSession),
    warnings: processing.warnings || [],
  });
}

export async function getUploadDocumentStatus({
  documentId,
  demoSessionId,
  dependencies = {},
} = {}) {
  requireDemoSessionId(demoSessionId);
  const deps = getDependencies(dependencies);
  const document = assertDocumentFound(
    await deps.repository.findUploadDocumentById({ documentId, demoSessionId }),
  );

  return toDocumentStatusDto(document);
}

export async function retryDocumentProcessing({
  documentId,
  demoSessionId,
  force = false,
  dependencies = {},
} = {}) {
  requireDemoSessionId(demoSessionId);
  const deps = getDependencies(dependencies);
  const document = assertDocumentFound(
    await deps.repository.findUploadDocumentById({ documentId, demoSessionId }),
  );
  assertRetryCandidate(document);
  assertRetryStatusAllowed(document, { force });

  const buffer = await deps.storageReader({
    objectKey: document.objectKey,
    storage: deps.storage,
  });
  const validation = deps.fileValidator([buildStoredUploadFile(document, buffer)]);
  const processing = await deps.processor({
    document,
    uploadFile: {
      validation,
      filenameMeta: buildRetryFilenameMeta(document),
      buffer: validation.buffer,
    },
    repository: deps.repository,
    extractor: deps.extractor,
    indexer: deps.indexer,
    embedder: deps.embedder,
    indexingRepositories: deps.indexingRepositories,
    options: {
      includeUploadedStatus: false,
      ...(deps.processingOptions || {}),
    },
  });

  return {
    status: processing.status === "completed" ? "retried" : "failed",
    document: toDocumentDto(processing.document || document),
    processing: toSafeRetryProcessing(processing, document),
    retry: {
      attempted: true,
      force: Boolean(force),
    },
  };
}
