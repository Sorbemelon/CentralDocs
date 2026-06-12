import path from "node:path";
import {
  GENERATED_DOCUMENT_CONTENT_TYPE,
  GENERATED_DOCUMENT_DEFAULT_FILENAME,
  GENERATED_DOCUMENT_ERROR_CODE,
  GENERATED_DOCUMENT_FILE_KIND,
  GENERATED_DOCUMENT_FORMAT,
  GENERATED_DOCUMENT_FORMATS,
  GENERATED_DOCUMENT_LIMITS,
  GENERATED_DOCUMENT_MIME_TYPE,
} from "../../constants/generatedDocument.constants.js";
import { createHttpError } from "../../utils/httpError.js";
import { sanitizeFilename } from "../storage/s3ObjectKeys.js";

const PATH_SEPARATOR_PATTERN = /[\\/]/;

function rejectUnsupportedFormat() {
  throw createHttpError(
    400,
    "Generated documents can only be saved as Markdown or plain text.",
    GENERATED_DOCUMENT_ERROR_CODE.UNSUPPORTED_FORMAT,
  );
}

function assertNoPathSegments(filename) {
  if (
    filename.includes("..") ||
    PATH_SEPARATOR_PATTERN.test(filename) ||
    path.basename(filename) !== filename
  ) {
    throw createHttpError(
      400,
      "Generated document filename must not contain path segments.",
      GENERATED_DOCUMENT_ERROR_CODE.UNSUPPORTED_FORMAT,
    );
  }
}

function capFilenameLength(filename) {
  if (filename.length <= GENERATED_DOCUMENT_LIMITS.maxFilenameLength) {
    return filename;
  }

  const extension = path.extname(filename);
  const basename = path.basename(filename, extension);
  const basenameLimit = Math.max(
    1,
    GENERATED_DOCUMENT_LIMITS.maxFilenameLength - extension.length,
  );

  return `${basename.slice(0, basenameLimit)}${extension}`;
}

export function buildUniqueGeneratedDocumentFilename(
  filename,
  existingFilenames = [],
  maxLength = GENERATED_DOCUMENT_LIMITS.maxFilenameLength,
) {
  const normalizedExisting = new Set(
    existingFilenames.map((value) => String(value || "").trim().toLowerCase()).filter(Boolean),
  );
  const conflicts = (candidate) => {
    const extension = path.extname(candidate);
    const basename = path.basename(candidate, extension);
    return (
      normalizedExisting.has(String(candidate || "").trim().toLowerCase()) ||
      normalizedExisting.has(String(basename || "").trim().toLowerCase())
    );
  };
  if (!conflicts(filename)) {
    return filename;
  }

  const extension = path.extname(filename);
  const basename = path.basename(filename, extension);
  for (let index = 2; index <= existingFilenames.length + 2; index += 1) {
    const suffix = ` (${index})`;
    const basenameLimit = Math.max(1, maxLength - extension.length - suffix.length);
    const candidate = `${basename.slice(0, basenameLimit).trimEnd()}${suffix}${extension}`;
    if (!conflicts(candidate)) {
      return candidate;
    }
  }

  return filename;
}

export function normalizeGeneratedDocumentFilename(filename = GENERATED_DOCUMENT_DEFAULT_FILENAME, {
  existingFilenames = [],
} = {}) {
  const raw = String(filename || "").trim() || GENERATED_DOCUMENT_DEFAULT_FILENAME;
  assertNoPathSegments(raw);

  const extensionWithDot = path.extname(raw);
  const requestedExtension = extensionWithDot.replace(".", "").toLowerCase();
  const extension = requestedExtension || GENERATED_DOCUMENT_FORMAT.MARKDOWN;

  if (!GENERATED_DOCUMENT_FORMATS.includes(extension)) {
    rejectUnsupportedFormat();
  }

  const basename = extensionWithDot ? path.basename(raw, extensionWithDot) : raw;
  if (!basename.trim()) {
    throw createHttpError(
      400,
      "Generated document filename must include a name.",
      GENERATED_DOCUMENT_ERROR_CODE.UNSUPPORTED_FORMAT,
    );
  }

  const sanitized = buildUniqueGeneratedDocumentFilename(
    capFilenameLength(sanitizeFilename(`${basename}.${extension}`)),
    existingFilenames,
  );
  const finalExtension = path.extname(sanitized).replace(".", "").toLowerCase();
  if (!GENERATED_DOCUMENT_FORMATS.includes(finalExtension)) {
    rejectUnsupportedFormat();
  }

  return {
    filename: sanitized,
    downloadFilename: sanitized,
    basename: path.basename(sanitized, path.extname(sanitized)),
    extension: finalExtension,
    fileKind: GENERATED_DOCUMENT_FILE_KIND[finalExtension],
    mimeType: GENERATED_DOCUMENT_MIME_TYPE[finalExtension],
    contentType: GENERATED_DOCUMENT_CONTENT_TYPE[finalExtension],
    outputFormat: finalExtension === GENERATED_DOCUMENT_FORMAT.TEXT ? "plain_text" : "markdown",
  };
}
