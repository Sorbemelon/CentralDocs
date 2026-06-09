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
  const indexedDocumentCount = documents.filter(
    (document) => (document.contentStats?.chunkCount || 0) > 0,
  ).length;
  const readyDocumentCount = documents.filter((document) => document.status === "ready").length;

  return {
    source,
    seeded,
    documentsDownloadable: seeded && downloadableCount === documents.length && documents.length > 0,
    indexed: seeded && indexedDocumentCount === documents.length && documents.length > 0
      ? true
      : indexedDocumentCount > 0
        ? "partial"
        : false,
    indexedDocumentCount,
    readyDocumentCount,
    mockDocumentCount: documents.length,
    mockFolderCount: folders.length,
    documentsSearchable: seeded && indexedDocumentCount > 0,
  };
}
