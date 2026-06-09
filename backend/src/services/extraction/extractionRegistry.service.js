import path from "node:path";
import {
  EXTRACTION_ERROR_CODE,
  EXTRACTION_FILE_KIND,
  EXTRACTION_SOURCE,
} from "../../constants/extraction.constants.js";
import { createHttpError, HttpError } from "../../utils/httpError.js";
import {
  findMockManifestDocument,
  loadMockManifest,
} from "../mockData/mockManifest.service.js";
import { resolveMockAssetPath, validateMockAsset } from "../mockData/mockAsset.service.js";
import {
  assertSupportedExtractionType,
  getFileKindFromFilename,
} from "./extractionTypes.service.js";
import { extractDocxFile } from "./docxExtractor.service.js";
import { extractMarkdownFile } from "./markdownExtractor.service.js";
import { extractMediaSidecar } from "./mediaSidecarExtractor.service.js";
import { extractPdfFile } from "./pdfExtractor.service.js";
import { extractPptxFile } from "./pptxExtractor.service.js";
import { extractSpreadsheetFile } from "./spreadsheetExtractor.service.js";
import { extractDelimitedTableFile } from "./tableExtractor.service.js";
import { extractTextFile } from "./textExtractor.service.js";

const EXTRACTORS = Object.freeze({
  [EXTRACTION_FILE_KIND.TEXT]: extractTextFile,
  [EXTRACTION_FILE_KIND.MARKDOWN]: extractMarkdownFile,
  [EXTRACTION_FILE_KIND.CSV]: extractDelimitedTableFile,
  [EXTRACTION_FILE_KIND.TSV]: extractDelimitedTableFile,
  [EXTRACTION_FILE_KIND.PDF]: extractPdfFile,
  [EXTRACTION_FILE_KIND.DOCX]: extractDocxFile,
  [EXTRACTION_FILE_KIND.XLSX]: extractSpreadsheetFile,
  [EXTRACTION_FILE_KIND.PPTX]: extractPptxFile,
  [EXTRACTION_FILE_KIND.IMAGE]: extractMediaSidecar,
  [EXTRACTION_FILE_KIND.AUDIO]: extractMediaSidecar,
  [EXTRACTION_FILE_KIND.VIDEO]: extractMediaSidecar,
});

function isMediaKind(fileKind) {
  return [
    EXTRACTION_FILE_KIND.IMAGE,
    EXTRACTION_FILE_KIND.AUDIO,
    EXTRACTION_FILE_KIND.VIDEO,
  ].includes(fileKind);
}

function safeExtractionFailure(error) {
  if (error instanceof HttpError) {
    return error;
  }

  return createHttpError(
    500,
    "Document text extraction failed.",
    EXTRACTION_ERROR_CODE.EXTRACTION_FAILED,
  );
}

function safeMockAssetFailure(error) {
  if (error.code === EXTRACTION_ERROR_CODE.INVALID_MOCK_ASSET_PATH) {
    return createHttpError(
      400,
      "Mock asset path is invalid.",
      EXTRACTION_ERROR_CODE.INVALID_MOCK_ASSET_PATH,
    );
  }
  if (error.code === EXTRACTION_ERROR_CODE.FILE_NOT_FOUND) {
    return createHttpError(
      404,
      "Mock asset file was not found.",
      EXTRACTION_ERROR_CODE.FILE_NOT_FOUND,
    );
  }

  return error;
}

export function getExtractorForFileKind(fileKind) {
  return EXTRACTORS[fileKind] || null;
}

export async function extractFile({
  filePath,
  originalFilename = path.basename(filePath || ""),
  mimeType = null,
  fileKind = null,
  source = EXTRACTION_SOURCE.PUBLIC_UPLOAD,
  document = null,
  manifest = null,
} = {}) {
  const resolvedFileKind = fileKind || getFileKindFromFilename(originalFilename, mimeType);
  assertSupportedExtractionType(resolvedFileKind, { source });
  const extractor = getExtractorForFileKind(resolvedFileKind);
  if (!extractor) {
    throw createHttpError(
      400,
      "No extractor is registered for this file type.",
      EXTRACTION_ERROR_CODE.UNSUPPORTED_FILE_TYPE,
      { fileKind: resolvedFileKind },
    );
  }

  try {
    if (isMediaKind(resolvedFileKind)) {
      return await extractor({
        document: document || { filename: originalFilename, fileKind: resolvedFileKind },
        manifest: manifest || {},
        originalFilename,
      });
    }

    return await extractor({
      filePath,
      originalFilename,
      fileKind: resolvedFileKind,
    });
  } catch (error) {
    throw safeExtractionFailure(error);
  }
}

export async function extractMockDocument({ documentIdOrSlug, manifestLoader = loadMockManifest } = {}) {
  const manifest = await manifestLoader();
  const document = findMockManifestDocument(manifest, documentIdOrSlug);
  if (!document) {
    throw createHttpError(404, "Mock document was not found.", "DOCUMENT_NOT_FOUND");
  }

  const foldersBySlug = new Map((manifest.folders || []).map((folder) => [folder.slug, folder]));
  try {
    await validateMockAsset(document, foldersBySlug.get(document.folderSlug) || {});
  } catch (error) {
    throw safeMockAssetFailure(error);
  }
  let filePath;
  try {
    filePath = resolveMockAssetPath(document);
  } catch (error) {
    throw safeMockAssetFailure(error);
  }

  return extractFile({
    filePath,
    originalFilename: document.filename,
    mimeType: document.mimeType,
    fileKind: document.fileKind,
    source: EXTRACTION_SOURCE.MOCK,
    document,
    manifest,
  });
}
