import {
  DOCUMENT_SCOPE,
  DOCUMENT_STATUS,
  SOURCE_TYPE,
} from "../../constants/document.constants.js";
import { LIFECYCLE_STATUS } from "../../constants/lifecycle.constants.js";
import { toMockDocumentId, toMockFolderId } from "../../utils/ids.js";
import { loadMockManifest } from "../mockData/mockManifest.service.js";
import { listSeededMockWorkspace } from "../mockData/mockSeed.repository.js";
import {
  getMockWorkspaceStorageSummary,
  MOCK_DOWNLOAD_PENDING_STATUS,
} from "../mockData/mockStorageMetadata.service.js";
import { toDocumentDtos } from "../documents/document.dto.js";
import { toFolderDtos } from "../folders/folder.dto.js";
import { extractMockDocument } from "../extraction/extractionRegistry.service.js";

const DIRECT_MULTIMODAL_INDEXING_MODE = "direct_multimodal_seed_cached";
const PREVIEW_TEXT_LIMIT = 8000;

function toIsoDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getFileExtension(filename = "") {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot < 0 || lastDot === filename.length - 1) {
    return "";
  }

  return filename.slice(lastDot + 1).toLowerCase();
}

function describeMockDocument(document) {
  if (Array.isArray(document.expectedTopics) && document.expectedTopics.length > 0) {
    return `Topics: ${document.expectedTopics.join(", ")}.`;
  }

  return document.title || document.filename || "Mock document";
}

function capPreviewText(text = "") {
  return String(text || "").slice(0, PREVIEW_TEXT_LIMIT);
}

async function getExtractedMockPreviewText(document = {}) {
  try {
    const extraction = await extractMockDocument({
      documentIdOrSlug: document.id || document.mockId || document.originalFilename || document.title,
    });
    return capPreviewText(extraction.optimizedText || extraction.extractedText || "");
  } catch {
    return null;
  }
}

function buildFolderDocumentCounts(documents = []) {
  return documents.reduce((counts, document) => {
    const slug = document.folderSlug;
    counts.set(slug, (counts.get(slug) || 0) + 1);
    return counts;
  }, new Map());
}

function buildMockFolder(folder, documentCount, timestamp) {
  return {
    id: toMockFolderId(folder.slug),
    slug: folder.slug,
    name: folder.title,
    parentFolderId: null,
    path: `/${folder.title}`,
    scope: DOCUMENT_SCOPE.MOCK,
    readOnly: true,
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
    documentCount,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function buildMockDocument(document, folder, timestamp) {
  const slug = `${document.folderSlug}/${document.filename}`;
  const isDirectMultimodalSeeded = document.indexingMode === DIRECT_MULTIMODAL_INDEXING_MODE;

  return {
    id: toMockDocumentId(slug),
    manifestPath: document.relativePath,
    title: document.title,
    originalFilename: document.filename,
    downloadFilename: document.filename,
    fileExtension: getFileExtension(document.filename),
    mimeType: document.mimeType,
    fileKind: document.fileKind,
    folderId: toMockFolderId(document.folderSlug),
    folderName: folder?.title || document.folderTitle || null,
    scope: document.scope || DOCUMENT_SCOPE.MOCK,
    sourceType: document.sourceType || SOURCE_TYPE.MOCK,
    readOnly: true,
    status: DOCUMENT_STATUS.READY,
    statusMessage: null,
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
    sizeBytes: document.sizeBytes || 0,
    contentStats: {
      extractedCharCount: 0,
      optimizedCharCount: 0,
      estimatedTokenCount: 0,
      chunkCount: 0,
    },
    generatedMeta: null,
    mediaMeta: isDirectMultimodalSeeded
      ? {
          directMultimodalEmbeddingSeeded: true,
          transcriptDocumentId: null,
          durationSeconds: null,
        }
      : null,
    createdAt: timestamp,
    updatedAt: timestamp,
    expiresAt: null,
    description: describeMockDocument(document),
    demoQuestions: document.demoQuestions || [],
    expectedTopics: document.expectedTopics || [],
    indexingMode: document.indexingMode || null,
    seeded: false,
    downloadAvailable: MOCK_DOWNLOAD_PENDING_STATUS,
    attachable: true,
    previewText: describeMockDocument(document),
  };
}

function matchesText(document, query) {
  if (!query) {
    return true;
  }

  const haystack = [
    document.title,
    document.description,
    document.originalFilename,
    ...(document.expectedTopics || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(String(query).trim().toLowerCase());
}

function matchesLifecycle(entity, filters = {}) {
  if (filters.lifecycleStatus) {
    return entity.lifecycleStatus === filters.lifecycleStatus;
  }

  return filters.includeTrash === "true" || entity.lifecycleStatus === LIFECYCLE_STATUS.ACTIVE;
}

function serializeId(value) {
  if (!value) {
    return null;
  }

  return String(value);
}

function buildPersistentWorkspace(seedRecords) {
  const folders = toFolderDtos(seedRecords.folders);
  const folderByDatabaseId = new Map(
    seedRecords.folders
      .map((folder, index) => [serializeId(folder._id || folder.id), folders[index]])
      .filter(([id]) => Boolean(id)),
  );
  const documents = toDocumentDtos(seedRecords.documents).map((document) => ({
    ...document,
    folderId: folderByDatabaseId.get(document.folderId)?.id || document.folderId,
    folderName: document.folderName || folderByDatabaseId.get(document.folderId)?.name || null,
    attachable: true,
    downloadAvailable: true,
    seeded: true,
  }));

  return {
    source: "persistent",
    seeded: true,
    workspaceTitle: "Orchid Retail Digital Transformation",
    description: "Persistent seeded mock workspace metadata.",
    version: null,
    generatedAt: null,
    sampleQuestions: [],
    folders,
    documents,
    counts: {
      folders: folders.length,
      documents: documents.length,
      mockFolders: folders.length,
      mockDocuments: documents.length,
    },
    mockDataRules: {
      readOnly: true,
      seeded: true,
    },
    mockWorkspace: getMockWorkspaceStorageSummary({
      source: "persistent",
      folders,
      documents,
    }),
  };
}

export async function buildDemoWorkspace({
  seedRepository = { listSeededMockWorkspace },
} = {}) {
  const seededRecords = await seedRepository.listSeededMockWorkspace();
  if (seededRecords.documents.length > 0) {
    return buildPersistentWorkspace(seededRecords);
  }

  const manifest = await loadMockManifest();
  const timestamp = toIsoDate(manifest.generatedAt || manifest.version);
  const folders = manifest.folders || [];
  const documents = manifest.documents || [];
  const documentCounts = buildFolderDocumentCounts(documents);
  const folderBySlug = new Map(folders.map((folder) => [folder.slug, folder]));

  const mockFolders = folders.map((folder) =>
    buildMockFolder(folder, documentCounts.get(folder.slug) || 0, timestamp),
  );
  const mockDocuments = documents.map((document) =>
    buildMockDocument(document, folderBySlug.get(document.folderSlug), timestamp),
  );

  return {
    source: "manifest",
    seeded: false,
    workspaceTitle: manifest.workspaceTitle,
    description: manifest.description,
    version: manifest.version,
    generatedAt: manifest.generatedAt,
    sampleQuestions: manifest.sampleQuestions || [],
    folders: mockFolders,
    documents: mockDocuments,
    counts: {
      folders: mockFolders.length,
      documents: mockDocuments.length,
      mockFolders: mockFolders.length,
      mockDocuments: mockDocuments.length,
    },
    mockDataRules: manifest.mockDataRules || {},
    mockWorkspace: getMockWorkspaceStorageSummary({
      source: "manifest",
      folders: mockFolders,
      documents: mockDocuments,
    }),
  };
}

export async function listMockFolders(filters = {}) {
  const workspace = await buildDemoWorkspace();

  if (filters.scope && filters.scope !== DOCUMENT_SCOPE.MOCK) {
    return [];
  }

  if (filters.parentFolderId) {
    return [];
  }

  return workspace.folders.filter((folder) => matchesLifecycle(folder, filters));
}

export async function listMockDocuments(filters = {}) {
  const workspace = await buildDemoWorkspace();

  return workspace.documents.filter((document) => {
    if (!matchesLifecycle(document, filters)) {
      return false;
    }
    if (filters.folderId && document.folderId !== filters.folderId) {
      return false;
    }
    if (filters.scope && document.scope !== filters.scope) {
      return false;
    }
    if (filters.sourceType && document.sourceType !== filters.sourceType) {
      return false;
    }
    if (filters.fileKind && document.fileKind !== filters.fileKind) {
      return false;
    }
    if (filters.status && document.status !== filters.status) {
      return false;
    }

    return matchesText(document, filters.q);
  });
}

export async function findMockFolderById(folderId) {
  const workspace = await buildDemoWorkspace();
  return workspace.folders.find((folder) => folder.id === folderId) || null;
}

export async function findMockDocumentById(documentId) {
  const workspace = await buildDemoWorkspace();
  return workspace.documents.find((document) => document.id === documentId) || null;
}

export async function listMockDocumentsForFolder(folderId, filters = {}) {
  const folder = await findMockFolderById(folderId);
  if (!folder) {
    return null;
  }

  return listMockDocuments({
    ...filters,
    folderId,
  });
}

export async function getMockDocumentPreview(documentId) {
  const document = await findMockDocumentById(documentId);
  if (!document) {
    return null;
  }

  const extractedPreview = await getExtractedMockPreviewText(document);
  const fallbackPreview = document.previewText || document.extractedTextPreview || document.description || null;

  return {
    id: document.id,
    title: document.title,
    description: document.description,
    demoQuestions: document.demoQuestions,
    fileKind: document.fileKind,
    folderName: document.folderName,
    previewText: extractedPreview || fallbackPreview,
    previewUnavailable: !(extractedPreview || fallbackPreview),
    extractionStatus: "not_started",
    phaseLimit: null,
  };
}
