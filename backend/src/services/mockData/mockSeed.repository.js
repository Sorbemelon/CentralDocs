import {
  DOCUMENT_SCOPE,
  DOCUMENT_STATUS,
  FOLDER_SCOPE,
  SOURCE_TYPE,
  STORAGE_PROVIDER,
} from "../../constants/document.constants.js";
import { LIFECYCLE_STATUS } from "../../constants/lifecycle.constants.js";
import { isMongoConnected } from "../../db/connectMongo.js";
import { Document } from "../../models/Document.model.js";
import { Folder } from "../../models/Folder.model.js";
import { toMockDocumentId, toMockFolderId } from "../../utils/ids.js";

function getFolderPath(folder) {
  return `/${folder.title || folder.name}`;
}

export function buildMockFolderUpsertPayloads(manifest = {}) {
  const documentCounts = (manifest.documents || []).reduce((counts, document) => {
    counts.set(document.folderSlug, (counts.get(document.folderSlug) || 0) + 1);
    return counts;
  }, new Map());

  return (manifest.folders || []).map((folder) => ({
    filter: { mockId: toMockFolderId(folder.slug), scope: FOLDER_SCOPE.MOCK },
    update: {
      $set: {
        demoSessionId: null,
        mockId: toMockFolderId(folder.slug),
        manifestPath: `documents/${folder.slug}`,
        scope: FOLDER_SCOPE.MOCK,
        name: folder.title,
        parentFolderId: null,
        path: getFolderPath(folder),
        readOnly: true,
        documentCount: documentCounts.get(folder.slug) || 0,
        lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
      },
    },
    options: { upsert: true, new: true, lean: true },
  }));
}

export function buildMockDocumentUpsertPayloads({ manifest = {}, assets = [], folderIdByMockId = new Map() } = {}) {
  const assetByMockId = new Map(assets.map((asset) => [asset.mockId, asset]));

  return (manifest.documents || []).map((document) => {
    const asset = assetByMockId.get(toMockDocumentId(`${document.folderSlug}/${document.filename}`)) ||
      assets.find((candidate) => candidate.manifestPath === document.relativePath);
    const mockId = asset?.mockId;

    return {
      filter: { mockId, scope: DOCUMENT_SCOPE.MOCK },
      update: {
        $set: {
          demoSessionId: null,
          mockId,
          manifestPath: asset?.manifestPath || document.relativePath,
          folderId: folderIdByMockId.get(asset?.folderMockId) || null,
          scope: DOCUMENT_SCOPE.MOCK,
          sourceType: SOURCE_TYPE.MOCK,
          title: document.title,
          originalFilename: asset?.filename || document.filename,
          downloadFilename: asset?.filename || document.filename,
          fileExtension: asset?.fileExtension || "",
          mimeType: asset?.mimeType || document.mimeType,
          fileKind: document.fileKind,
          storageProvider: STORAGE_PROVIDER.S3,
          objectKey: asset?.objectKey,
          sizeBytes: asset?.sizeBytes || document.sizeBytes || 0,
          checksum: document.sha256 || null,
          status: DOCUMENT_STATUS.READY,
          statusMessage: null,
          extractedTextPreview: null,
          contentStats: {
            extractedCharCount: 0,
            optimizedCharCount: 0,
            estimatedTokenCount: 0,
            chunkCount: 0,
          },
          mediaMeta: asset?.mediaMeta || null,
          description: asset?.description || document.title,
          demoQuestions: document.demoQuestions || [],
          readOnly: true,
          lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
          expiresAt: null,
        },
      },
      options: { upsert: true, new: true, lean: true },
    };
  });
}

export function isMockSeedPersistenceAvailable() {
  return isMongoConnected();
}

export async function upsertMockFolders(manifest) {
  const folderIdByMockId = new Map();
  let upsertedFolders = 0;

  for (const payload of buildMockFolderUpsertPayloads(manifest)) {
    const folder = await Folder.findOneAndUpdate(payload.filter, payload.update, payload.options);
    folderIdByMockId.set(folder.mockId, folder._id);
    upsertedFolders += 1;
  }

  return { upsertedFolders, folderIdByMockId };
}

export async function upsertMockDocuments({ manifest, assets, folderIdByMockId }) {
  let upsertedDocuments = 0;

  for (const payload of buildMockDocumentUpsertPayloads({ manifest, assets, folderIdByMockId })) {
    await Document.findOneAndUpdate(payload.filter, payload.update, payload.options);
    upsertedDocuments += 1;
  }

  return { upsertedDocuments };
}

export async function upsertMockWorkspace({ manifest, assets }) {
  if (!isMockSeedPersistenceAvailable()) {
    return {
      status: "skipped_not_configured",
      configured: false,
      upsertedFolders: 0,
      upsertedDocuments: 0,
    };
  }

  const folders = await upsertMockFolders(manifest);
  const documents = await upsertMockDocuments({
    manifest,
    assets,
    folderIdByMockId: folders.folderIdByMockId,
  });

  return {
    status: "completed",
    configured: true,
    upsertedFolders: folders.upsertedFolders,
    upsertedDocuments: documents.upsertedDocuments,
  };
}

export async function findSeededMockDocumentByMockId(mockId) {
  if (!isMockSeedPersistenceAvailable()) {
    return null;
  }

  return Document.findOne({
    mockId,
    scope: DOCUMENT_SCOPE.MOCK,
    lifecycleStatus: LIFECYCLE_STATUS.ACTIVE,
  }).lean();
}

export async function listSeededMockWorkspace() {
  if (!isMockSeedPersistenceAvailable()) {
    return { folders: [], documents: [] };
  }

  const [folders, documents] = await Promise.all([
    Folder.find({ scope: DOCUMENT_SCOPE.MOCK, lifecycleStatus: LIFECYCLE_STATUS.ACTIVE }).lean(),
    Document.find({ scope: DOCUMENT_SCOPE.MOCK, lifecycleStatus: LIFECYCLE_STATUS.ACTIVE }).lean(),
  ]);

  return { folders, documents };
}
