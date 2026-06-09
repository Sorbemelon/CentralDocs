import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const {
  getManifestStorageObjectKey,
  getMockWorkspaceStorageSummary,
  MOCK_DOWNLOAD_PENDING_STATUS,
  MOCK_WORKSPACE_ID,
} = await import("../src/services/mockData/mockStorageMetadata.service.js");

test("mock storage metadata reads compatible manifest object-key fields", () => {
  assert.equal(getManifestStorageObjectKey({ objectKey: "mock/a" }), "mock/a");
  assert.equal(getManifestStorageObjectKey({ storageKey: "mock/b" }), "mock/b");
  assert.equal(getManifestStorageObjectKey({ s3ObjectKey: "mock/c" }), "mock/c");
  assert.equal(getManifestStorageObjectKey({ downloadObjectKey: "mock/d" }), "mock/d");
  assert.equal(getManifestStorageObjectKey({ storage: { objectKey: "mock/e" } }), "mock/e");
  assert.equal(getManifestStorageObjectKey({ storage: { key: "mock/f" } }), "mock/f");
  assert.equal(getManifestStorageObjectKey({}), null);
});

test("mock storage summary separates manifest fallback from persistent seed state", () => {
  const manifestSummary = getMockWorkspaceStorageSummary({
    source: "manifest",
    folders: [{ id: "mock_folder_a" }],
    documents: [{ id: "mock_document_a", downloadAvailable: MOCK_DOWNLOAD_PENDING_STATUS }],
  });
  const persistentSummary = getMockWorkspaceStorageSummary({
    source: "persistent",
    folders: [{ id: "mock_folder_a" }],
    documents: [{ id: "mock_document_a", downloadAvailable: true }],
  });

  assert.equal(MOCK_WORKSPACE_ID, "orchid-retail");
  assert.equal(manifestSummary.seeded, false);
  assert.equal(manifestSummary.documentsDownloadable, false);
  assert.equal(manifestSummary.mockDocumentCount, 1);
  assert.equal(persistentSummary.seeded, true);
  assert.equal(persistentSummary.documentsDownloadable, true);
});
