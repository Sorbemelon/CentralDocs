import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lookup as lookupMimeType } from "mime-types";
import { EXTRACTION_ERROR_CODE } from "../../constants/extraction.constants.js";
import { toMockDocumentId, toMockFolderId } from "../../utils/ids.js";
import { buildMockObjectKey } from "../storage/s3ObjectKeys.js";
import { MOCK_WORKSPACE_ID } from "./mockStorageMetadata.service.js";

const mockDataRoot = fileURLToPath(new URL("../../../mock-data/", import.meta.url));
const mockDocumentsRoot = path.resolve(mockDataRoot, "documents");

function ensureInsideMockDocumentsRoot(candidatePath) {
  const resolved = path.resolve(candidatePath);
  const relative = path.relative(mockDocumentsRoot, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    const error = new Error("Mock asset path must stay inside backend/mock-data/documents.");
    error.code = EXTRACTION_ERROR_CODE.INVALID_MOCK_ASSET_PATH;
    throw error;
  }

  return resolved;
}

function normalizeManifestRelativePath(document = {}) {
  const rawPath =
    document.filePath || document.localPath || document.relativePath || `${document.folderSlug}/${document.filename}`;
  const normalized = String(rawPath || "").replaceAll("\\", "/");

  if (!normalized || normalized.includes("..") || normalized.startsWith("/")) {
    const error = new Error("Mock asset manifest path is unsafe.");
    error.code = EXTRACTION_ERROR_CODE.INVALID_MOCK_ASSET_PATH;
    throw error;
  }

  return normalized.startsWith("documents/")
    ? normalized.slice("documents/".length)
    : normalized;
}

function getFileExtension(filename = "") {
  const extension = path.extname(filename).replace(".", "").toLowerCase();
  return extension;
}

function inferMimeType(filename, fallbackMimeType) {
  return fallbackMimeType || lookupMimeType(filename) || "application/octet-stream";
}

function isDirectMultimodalSeed(document) {
  return document.indexingMode === "direct_multimodal_seed_cached";
}

export function resolveMockAssetPath(document = {}) {
  const manifestRelativePath = normalizeManifestRelativePath(document);
  return ensureInsideMockDocumentsRoot(path.join(mockDocumentsRoot, manifestRelativePath));
}

export function buildMockAssetMetadata(document = {}, folder = {}) {
  const mockId = toMockDocumentId(`${document.folderSlug}/${document.filename}`);
  const filename = document.filename || path.basename(normalizeManifestRelativePath(document));
  const objectKey =
    document.objectKey ||
    buildMockObjectKey({
      workspaceId: MOCK_WORKSPACE_ID,
      documentId: mockId,
      filename,
    });

  return {
    mockId,
    folderMockId: toMockFolderId(document.folderSlug),
    filename,
    fileExtension: getFileExtension(filename),
    mimeType: inferMimeType(filename, document.mimeType),
    objectKey,
    localPath: resolveMockAssetPath(document),
    manifestPath: document.relativePath || `documents/${document.folderSlug}/${filename}`,
    description:
      Array.isArray(document.expectedTopics) && document.expectedTopics.length > 0
        ? `Topics: ${document.expectedTopics.join(", ")}.`
        : document.title || filename,
    mediaMeta: isDirectMultimodalSeed(document)
      ? {
          directMultimodalEmbeddingSeeded: true,
          transcriptDocumentId: null,
          durationSeconds: null,
        }
      : null,
    folderName: folder.title || document.folderTitle || null,
  };
}

export async function validateMockAsset(document = {}, folder = {}) {
  const metadata = buildMockAssetMetadata(document, folder);
  let fileStats;
  try {
    fileStats = await stat(metadata.localPath);
  } catch (error) {
    const safeError = new Error("Mock asset file was not found.");
    safeError.code = EXTRACTION_ERROR_CODE.FILE_NOT_FOUND;
    throw safeError;
  }

  return {
    ...metadata,
    sizeBytes: document.sizeBytes || fileStats.size,
    manifestSizeBytes: document.sizeBytes || null,
    exists: fileStats.isFile(),
  };
}

export async function validateMockAssets(manifest = {}) {
  const foldersBySlug = new Map((manifest.folders || []).map((folder) => [folder.slug, folder]));
  const assets = [];

  for (const document of manifest.documents || []) {
    assets.push(await validateMockAsset(document, foldersBySlug.get(document.folderSlug) || {}));
  }

  return assets;
}
