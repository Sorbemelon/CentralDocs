export const MOCK_WORKSPACE_ID = "orchid-retail";
export const MOCK_DOWNLOAD_PENDING_STATUS = "pending_seed";

export function getManifestStorageObjectKey(document = {}) {
  return (
    document.objectKey ||
    document.storageKey ||
    document.s3ObjectKey ||
    document.downloadObjectKey ||
    document.storage?.objectKey ||
    document.storage?.key ||
    null
  );
}

export function getMockWorkspaceStorageSummary({ source = "manifest", folders = [], documents = [] } = {}) {
  const seeded = source === "persistent";
  const downloadableCount = documents.filter((document) => document.downloadAvailable === true).length;

  return {
    source,
    seeded,
    documentsDownloadable: seeded && downloadableCount === documents.length && documents.length > 0,
    mockDocumentCount: documents.length,
    mockFolderCount: folders.length,
  };
}
