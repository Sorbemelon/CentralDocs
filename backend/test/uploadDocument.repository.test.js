import { test } from "node:test";
import assert from "node:assert/strict";

const {
  buildUploadDocumentPayload,
  createMemoryUploadDocumentRepository,
  isFolderAllowedForUpload,
} = await import("../src/services/uploads/uploadDocument.repository.js");
const { toDocumentDto } = await import("../src/services/documents/document.dto.js");

const validation = {
  originalFilename: "brief.md",
  sizeBytes: 12,
  fileKind: "markdown",
  fileExtension: "md",
  mimeType: "text/markdown",
};
const filenameMeta = {
  originalFilename: "brief.md",
  downloadFilename: "brief.md",
  title: "Brief",
  fileExtension: "md",
};

test("upload repository builds user upload Document payload", () => {
  const payload = buildUploadDocumentPayload({
    documentId: "upload_1",
    demoSessionId: "demo_123",
    folderId: "folder_1",
    filenameMeta,
    validation,
    objectKey: "demo-sessions/demo_123/uploads/upload_1/brief.md",
    expiresAt: "2026-06-12T00:00:00.000Z",
  });

  assert.equal(payload.scope, "user");
  assert.equal(payload.sourceType, "upload");
  assert.equal(payload.status, "uploaded");
  assert.equal(payload.lifecycleStatus, "active");
  assert.equal(payload.storageProvider, "s3");
  assert.equal(payload.readOnly, false);
  assert.equal(payload.objectKey, "demo-sessions/demo_123/uploads/upload_1/brief.md");
});

test("upload repository memory fake stores internal key while DTO hides it", async () => {
  const repository = createMemoryUploadDocumentRepository();
  const payload = buildUploadDocumentPayload({
    documentId: repository.createDocumentId(),
    demoSessionId: "demo_123",
    filenameMeta,
    validation,
    objectKey: "demo-sessions/demo_123/uploads/upload_1/brief.md",
  });
  const created = await repository.createUploadDocumentRecord(payload);
  const dto = toDocumentDto(created);

  assert.equal(created.objectKey, "demo-sessions/demo_123/uploads/upload_1/brief.md");
  assert.equal(dto.scope, "user");
  assert.equal(dto.sourceType, "upload");
  assert.equal(dto.downloadAvailable, true);
  assert.equal("objectKey" in dto, false);
});

test("upload repository folder guard accepts active user folders only", () => {
  assert.equal(
    isFolderAllowedForUpload(
      {
        demoSessionId: "demo_123",
        scope: "user",
        readOnly: false,
        lifecycleStatus: "active",
      },
      "demo_123",
    ),
    true,
  );
  assert.equal(
    isFolderAllowedForUpload(
      {
        demoSessionId: "demo_123",
        scope: "mock",
        readOnly: true,
        lifecycleStatus: "active",
      },
      "demo_123",
    ),
    false,
  );
  assert.equal(
    isFolderAllowedForUpload(
      {
        demoSessionId: "demo_other",
        scope: "user",
        readOnly: false,
        lifecycleStatus: "active",
      },
      "demo_123",
    ),
    false,
  );
});
