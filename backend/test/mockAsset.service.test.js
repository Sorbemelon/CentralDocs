import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const {
  buildMockAssetMetadata,
  resolveMockAssetPath,
  validateMockAsset,
  validateMockAssets,
} = await import("../src/services/mockData/mockAsset.service.js");
const { loadMockManifest } = await import("../src/services/mockData/mockManifest.service.js");
const { MOCK_WORKSPACE_ID } = await import(
  "../src/services/mockData/mockStorageMetadata.service.js"
);

const mockDocumentsRoot = path.resolve(
  fileURLToPath(new URL("../mock-data/documents/", import.meta.url)),
);

test("mock asset service resolves manifest files inside mock documents root", async () => {
  const manifest = await loadMockManifest();
  const assets = await validateMockAssets(manifest);

  assert.equal(assets.length, manifest.documents.length);
  assert.ok(assets.every((asset) => asset.exists === true));
  assert.ok(
    assets.every((asset) => {
      const relative = path.relative(mockDocumentsRoot, asset.localPath);
      return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
    }),
  );
});

test("mock asset service rejects path traversal", async () => {
  await assert.rejects(
    () =>
      validateMockAsset({
        folderSlug: "01-strategy-rollout",
        filename: "evil.md",
        relativePath: "documents/../evil.md",
      }),
    {
      code: "INVALID_MOCK_ASSET_PATH",
    },
  );
});

test("mock asset service computes size and infers extension and MIME type", async () => {
  const manifest = await loadMockManifest();
  const document = manifest.documents.find((candidate) =>
    candidate.filename.endsWith(".md"),
  );
  const asset = await validateMockAsset(document, { title: document.folderTitle });

  assert.equal(asset.filename, document.filename);
  assert.equal(asset.fileExtension, "md");
  assert.equal(asset.mimeType, "text/markdown");
  assert.equal(asset.sizeBytes, document.sizeBytes);
  assert.ok(asset.localPath.endsWith(path.join(document.folderSlug, document.filename)));
});

test("mock asset service builds stable mock object keys and cached media metadata", async () => {
  const manifest = await loadMockManifest();
  const mediaDocument = manifest.documents.find(
    (document) => document.indexingMode === "direct_multimodal_seed_cached",
  );
  const metadata = buildMockAssetMetadata(mediaDocument, { title: mediaDocument.folderTitle });
  const resolved = resolveMockAssetPath(mediaDocument);

  assert.ok(metadata.mockId.startsWith("mock_document_"));
  assert.ok(metadata.folderMockId.startsWith("mock_folder_"));
  assert.equal(
    metadata.objectKey,
    `mock/${MOCK_WORKSPACE_ID}/original/${metadata.mockId}/${mediaDocument.filename}`,
  );
  assert.equal(metadata.mediaMeta.directMultimodalEmbeddingSeeded, true);
  assert.equal(resolved, metadata.localPath);
});
