const MOCK_ID_MAX_LENGTH = 140;

export function normalizeMockIdPart(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized.slice(0, MOCK_ID_MAX_LENGTH) || "unknown";
}

export function toMockFolderId(slug) {
  return `mock_folder_${normalizeMockIdPart(slug)}`;
}

export function toMockDocumentId(slugOrPath) {
  return `mock_document_${normalizeMockIdPart(slugOrPath)}`;
}

export function isMockFolderId(value) {
  return typeof value === "string" && value.startsWith("mock_folder_");
}

export function isMockDocumentId(value) {
  return typeof value === "string" && value.startsWith("mock_document_");
}
