import { createHttpError } from "../../utils/httpError.js";
import { findMockManifestDocument, loadMockManifest } from "../mockData/mockManifest.service.js";
import { indexMockDocument as indexSingleMockDocument } from "./documentIndexing.service.js";

function selectManifestDocuments(manifest = {}, documentIdOrSlug = null) {
  if (!documentIdOrSlug) {
    return manifest.documents || [];
  }

  const document = findMockManifestDocument(manifest, documentIdOrSlug);
  return document ? [document] : [];
}

function toDocumentSlug(document) {
  return `${document.folderSlug}/${document.filename}`;
}

export async function indexMockDocument(options = {}) {
  return indexSingleMockDocument(options);
}

export async function indexMockWorkspaceDocuments({
  documentIdOrSlug = null,
  dryRun = false,
  embedder,
  repositories = {},
  manifestLoader = loadMockManifest,
  options = {},
} = {}) {
  const manifest = await manifestLoader();
  const documents = selectManifestDocuments(manifest, documentIdOrSlug);
  if (documents.length === 0) {
    throw createHttpError(404, "Mock document was not found.", "MOCK_DOCUMENT_NOT_FOUND");
  }

  const results = [];
  const failures = [];

  for (const document of documents) {
    const slug = toDocumentSlug(document);
    try {
      const result = await indexSingleMockDocument({
        slug,
        embedder,
        repositories,
        options: {
          ...options,
          dryRun,
        },
      });
      results.push(result);
    } catch (error) {
      failures.push({
        document: slug,
        code: error.code || "INDEXING_FAILED",
        message: error.message,
      });
      if (!options.continueOnError) {
        break;
      }
    }
  }

  return {
    status: failures.length > 0 ? (results.length > 0 ? "partial" : "failed") : "completed",
    mode: dryRun ? "dry_run" : "persistent",
    workspace: manifest.workspaceTitle,
    requestedDocument: documentIdOrSlug || null,
    documentsSelected: documents.length,
    indexedDocuments: results.length,
    failedDocuments: failures.length,
    chunks: results.reduce((sum, result) => sum + (result.chunkCount || 0), 0),
    results,
    failures,
  };
}
