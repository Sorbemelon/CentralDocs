import { readFile } from "node:fs/promises";
import { loadMockManifest } from "./mockManifest.service.js";
import { validateMockAssets } from "./mockAsset.service.js";
import { isMockSeedPersistenceAvailable, upsertMockWorkspace } from "./mockSeed.repository.js";
import { getStorageStatus, putObject } from "../storage/s3Storage.service.js";

function createBaseSummary(manifest, assets) {
  return {
    status: "completed",
    mode: "foundation",
    workspace: manifest.workspaceTitle,
    folders: (manifest.folders || []).length,
    documents: (manifest.documents || []).length,
    assetsValidated: assets.length,
    s3: {
      configured: false,
      status: "skipped_not_configured",
      uploaded: 0,
      skipped: assets.length,
    },
    mongo: {
      configured: false,
      status: "skipped_not_configured",
      upsertedFolders: 0,
      upsertedDocuments: 0,
    },
  };
}

async function uploadMockAssets({ assets, storage, dryRun }) {
  const storageStatus = storage.getStorageStatus();
  const configured = Boolean(storageStatus.configured);

  if (dryRun) {
    return {
      configured,
      status: "dry_run",
      uploaded: 0,
      skipped: assets.length,
    };
  }
  if (!configured) {
    return {
      configured: false,
      status: "skipped_not_configured",
      uploaded: 0,
      skipped: assets.length,
    };
  }

  let uploaded = 0;

  for (const asset of assets) {
    await storage.putObject({
      objectKey: asset.objectKey,
      body: await readFile(asset.localPath),
      contentType: asset.mimeType,
    });
    uploaded += 1;
  }

  return {
    configured: true,
    status: "completed",
    uploaded,
    skipped: assets.length - uploaded,
  };
}

async function upsertMetadata({ manifest, assets, repository, dryRun }) {
  if (dryRun) {
    return {
      configured: repository.isMockSeedPersistenceAvailable(),
      status: "dry_run",
      upsertedFolders: 0,
      upsertedDocuments: 0,
    };
  }

  return repository.upsertMockWorkspace({ manifest, assets });
}

export async function seedMockWorkspace({
  dryRun = false,
  manifestLoader = loadMockManifest,
  assetValidator = validateMockAssets,
  storage = { getStorageStatus, putObject },
  repository = { isMockSeedPersistenceAvailable, upsertMockWorkspace },
} = {}) {
  const manifest = await manifestLoader();
  const assets = await assetValidator(manifest);
  const summary = createBaseSummary(manifest, assets);
  const s3 = await uploadMockAssets({ assets, storage, dryRun });
  const mongo = await upsertMetadata({ manifest, assets, repository, dryRun });

  return {
    ...summary,
    mode: mongo.configured ? "persistent" : "foundation",
    s3,
    mongo,
  };
}
