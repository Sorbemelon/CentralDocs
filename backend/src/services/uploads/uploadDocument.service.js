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
import { saveUploadObject } from "./uploadStorage.service.js";
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
    ![SOURCE_TYPE.UPLOAD, SOURCE_TYPE.GENERATED].includes(document.sourceType)
  ) {
    throw createHttpError(
      409,
      "This document cannot be retried.",
      UPLOAD_ERROR_CODE.DOCUMENT_RETRY_NOT_ALLOWED,
    );
  }
  if (document.status !== DOCUMENT_STATUS.FAILED) {
    throw createHttpError(
      409,
      "Only failed documents can be retried.",
      UPLOAD_ERROR_CODE.DOCUMENT_RETRY_NOT_ALLOWED,
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
  const document = await deps.repository.createUploadDocumentRecord(payload);
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
  dependencies = {},
} = {}) {
  requireDemoSessionId(demoSessionId);
  const deps = getDependencies(dependencies);
  const document = assertDocumentFound(
    await deps.repository.findUploadDocumentById({ documentId, demoSessionId }),
  );
  assertRetryCandidate(document);

  throw createHttpError(
    409,
    "Retry requires S3 read support and is reserved for a later upload processing phase.",
    UPLOAD_ERROR_CODE.RETRY_NOT_AVAILABLE,
    {
      document: toDocumentDto(document),
    },
  );
}
