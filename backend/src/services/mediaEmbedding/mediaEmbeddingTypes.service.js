import { FILE_KIND, SOURCE_TYPE, DOCUMENT_SCOPE } from "../../constants/document.constants.js";
import { LIFECYCLE_STATUS } from "../../constants/lifecycle.constants.js";
import {
  EMBEDDING_INPUT_TYPE,
  MEDIA_EMBEDDING_ERROR_CODE,
} from "../../constants/mediaEmbedding.constants.js";
import { createHttpError } from "../../utils/httpError.js";

const DIRECT_MEDIA_FILE_KINDS = Object.freeze([
  FILE_KIND.IMAGE,
  FILE_KIND.AUDIO,
  FILE_KIND.VIDEO,
]);

export function isDirectMediaFileKind(fileKind) {
  return DIRECT_MEDIA_FILE_KINDS.includes(fileKind);
}

export function isSupportedDirectMediaMimeType(mimeType = "") {
  const value = String(mimeType || "").toLowerCase();
  return value.startsWith("image/") || value.startsWith("audio/") || value.startsWith("video/");
}

export function getMediaInputType(fileKind) {
  if (fileKind === FILE_KIND.IMAGE) {
    return EMBEDDING_INPUT_TYPE.IMAGE;
  }
  if (fileKind === FILE_KIND.AUDIO) {
    return EMBEDDING_INPUT_TYPE.AUDIO;
  }
  if (fileKind === FILE_KIND.VIDEO) {
    return EMBEDDING_INPUT_TYPE.VIDEO;
  }

  throw createHttpError(
    400,
    "Direct media embedding supports image, audio, and video mock documents only.",
    MEDIA_EMBEDDING_ERROR_CODE.MEDIA_EMBEDDING_UNSUPPORTED,
    { fileKind: fileKind || null },
  );
}

export function getMediaInputTypeFromMimeType(mimeType = "") {
  const value = String(mimeType || "").toLowerCase();
  if (value.startsWith("image/")) {
    return EMBEDDING_INPUT_TYPE.IMAGE;
  }
  if (value.startsWith("audio/")) {
    return EMBEDDING_INPUT_TYPE.AUDIO;
  }
  if (value.startsWith("video/")) {
    return EMBEDDING_INPUT_TYPE.VIDEO;
  }

  throw createHttpError(
    400,
    "Direct media embedding does not support this MIME type.",
    MEDIA_EMBEDDING_ERROR_CODE.MEDIA_EMBEDDING_UNSUPPORTED,
  );
}

export function assertMockMediaDocument(document = {}) {
  if (document.lifecycleStatus === LIFECYCLE_STATUS.TRASHED) {
    throw createHttpError(409, "Trashed documents cannot be media-embedded.", "DOCUMENT_TRASHED");
  }
  if (!isDirectMediaFileKind(document.fileKind)) {
    throw createHttpError(
      400,
      "Direct media embedding supports image, audio, and video mock documents only.",
      MEDIA_EMBEDDING_ERROR_CODE.MEDIA_EMBEDDING_UNSUPPORTED,
      { fileKind: document.fileKind || null },
    );
  }
  if (
    document.scope !== DOCUMENT_SCOPE.MOCK ||
    document.sourceType !== SOURCE_TYPE.MOCK ||
    document.readOnly !== true
  ) {
    throw createHttpError(
      403,
      "Direct media embedding is allowed only for read-only mock media documents.",
      MEDIA_EMBEDDING_ERROR_CODE.MEDIA_EMBEDDING_MOCK_ONLY,
    );
  }

  return document;
}

export function buildMediaEmbeddingLabel(document = {}) {
  const title = document.title || document.originalFilename || document.filename || "Mock media document";
  const kind = document.fileKind || "media";
  return `Direct ${kind} embedding: ${title}`;
}
