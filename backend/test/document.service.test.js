import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
delete process.env.MONGODB_URI;

const {
  getDocumentById,
  getDocumentPreviewById,
  listDocuments,
  moveDocument,
} = await import("../src/services/documents/document.service.js");
const { toDocumentDto } = await import("../src/services/documents/document.dto.js");
const { toMockDocumentId } = await import("../src/utils/ids.js");

const briefDocumentId = toMockDocumentId(
  "01-strategy-rollout/centraldocs-transformation-brief.md",
);

test("document service lists and filters mock documents", async () => {
  const allDocuments = await listDocuments();
  const markdownDocuments = await listDocuments({ query: { fileKind: "markdown" } });
  const searchDocuments = await listDocuments({ query: { q: "vendor onboarding" } });

  assert.equal(allDocuments.persistenceStatus, "not_configured");
  assert.equal(allDocuments.documents.length, 16);
  assert.ok(markdownDocuments.documents.every((document) => document.fileKind === "markdown"));
  assert.ok(searchDocuments.documents.some((document) => document.title === "Vendor Onboarding Checklist"));
});

test("document service returns mock detail and preview", async () => {
  const detail = await getDocumentById({ documentId: briefDocumentId });
  const preview = await getDocumentPreviewById({ documentId: briefDocumentId });

  assert.equal(detail.id, briefDocumentId);
  assert.equal(detail.status, "ready");
  assert.equal(detail.scope, "mock");
  assert.ok(!("objectKey" in detail));
  assert.equal(preview.previewUnavailable, false);
  assert.equal(preview.folderName, "Strategy & Rollout");
});

test("document service rejects read-only mock move", async () => {
  await assert.rejects(
    () => moveDocument({ documentId: briefDocumentId, demoSessionId: "demo_test", folderId: null }),
    { code: "READ_ONLY_RESOURCE", statusCode: 403 },
  );
});

test("document DTO hides storage internals", () => {
  const dto = toDocumentDto({
    _id: "document_1",
    title: "Stored Doc",
    originalFilename: "stored.md",
    downloadFilename: "stored.md",
    fileExtension: "md",
    mimeType: "text/markdown",
    fileKind: "markdown",
    folderId: null,
    scope: "user",
    sourceType: "upload",
    readOnly: false,
    status: "ready",
    lifecycleStatus: "active",
    sizeBytes: 12,
    objectKey: "private/object/key",
    contentStats: {},
  });

  assert.equal(dto.id, "document_1");
  assert.equal(dto.downloadAvailable, true);
  assert.ok(!("objectKey" in dto));
  assert.ok(!("_id" in dto));
});
