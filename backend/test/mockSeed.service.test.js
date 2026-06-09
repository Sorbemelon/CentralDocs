import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
delete process.env.MONGODB_URI;
delete process.env.AWS_REGION;
delete process.env.AWS_S3_BUCKET;
delete process.env.AWS_ACCESS_KEY_ID;
delete process.env.AWS_SECRET_ACCESS_KEY;

const { seedMockWorkspace } = await import("../src/services/mockData/mockSeed.service.js");
const { validateMockAssets } = await import("../src/services/mockData/mockAsset.service.js");
const { loadMockManifest } = await import("../src/services/mockData/mockManifest.service.js");

test("mock seed service dry-run validates files and returns safe summary", async () => {
  const summary = await seedMockWorkspace({ dryRun: true });

  assert.equal(summary.status, "completed");
  assert.equal(summary.mode, "foundation");
  assert.equal(summary.workspace, "Orchid Retail Digital Transformation");
  assert.equal(summary.folders, 6);
  assert.equal(summary.documents, 16);
  assert.equal(summary.assetsValidated, 16);
  assert.equal(summary.s3.status, "dry_run");
  assert.equal(summary.mongo.status, "dry_run");
  assert.equal(JSON.stringify(summary).includes("secretAccessKey"), false);
});

test("mock seed service skips Mongo and S3 when not configured", async () => {
  const summary = await seedMockWorkspace();

  assert.equal(summary.mode, "foundation");
  assert.equal(summary.s3.configured, false);
  assert.equal(summary.s3.status, "skipped_not_configured");
  assert.equal(summary.s3.uploaded, 0);
  assert.equal(summary.mongo.configured, false);
  assert.equal(summary.mongo.status, "skipped_not_configured");
});

test("mock seed service uploads mock assets through injected S3 adapter", async () => {
  const uploaded = [];
  const summary = await seedMockWorkspace({
    storage: {
      getStorageStatus: () => ({ configured: true }),
      putObject: async ({ objectKey, body, contentType }) => {
        uploaded.push({ objectKey, byteLength: body.byteLength, contentType });
        return { etag: "etag" };
      },
    },
    repository: {
      isMockSeedPersistenceAvailable: () => false,
      upsertMockWorkspace: async () => ({
        configured: false,
        status: "skipped_not_configured",
        upsertedFolders: 0,
        upsertedDocuments: 0,
      }),
    },
  });

  assert.equal(summary.s3.status, "completed");
  assert.equal(summary.s3.uploaded, 16);
  assert.equal(uploaded.length, 16);
  assert.ok(uploaded.every((asset) => asset.objectKey.startsWith("mock/orchid-retail/")));
  assert.ok(uploaded.every((asset) => asset.byteLength > 0));
  assert.ok(uploaded.some((asset) => asset.contentType === "audio/mpeg"));
});

test("mock seed service upserts persistent mock metadata through injected repository", async () => {
  let captured = null;
  const summary = await seedMockWorkspace({
    storage: {
      getStorageStatus: () => ({ configured: false }),
      putObject: async () => {
        throw new Error("S3 should be skipped");
      },
    },
    repository: {
      isMockSeedPersistenceAvailable: () => true,
      upsertMockWorkspace: async ({ manifest, assets }) => {
        captured = { manifest, assets };
        return {
          configured: true,
          status: "completed",
          upsertedFolders: manifest.folders.length,
          upsertedDocuments: assets.length,
        };
      },
    },
  });

  assert.equal(summary.mode, "persistent");
  assert.equal(summary.mongo.status, "completed");
  assert.equal(summary.mongo.upsertedFolders, 6);
  assert.equal(summary.mongo.upsertedDocuments, 16);
  assert.equal(captured.manifest.workspaceTitle, "Orchid Retail Digital Transformation");
  assert.equal(captured.assets.length, 16);
});

test("mock seed service produces stable asset IDs and cached media metadata", async () => {
  const manifest = await loadMockManifest();
  const first = await validateMockAssets(manifest);
  const second = await validateMockAssets(manifest);
  const mediaAsset = first.find((asset) => asset.mediaMeta?.directMultimodalEmbeddingSeeded);

  assert.deepEqual(
    first.map((asset) => asset.mockId),
    second.map((asset) => asset.mockId),
  );
  assert.ok(first.every((asset) => asset.objectKey.startsWith("mock/orchid-retail/original/")));
  assert.equal(mediaAsset.mediaMeta.directMultimodalEmbeddingSeeded, true);
});
