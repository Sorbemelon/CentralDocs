import { test } from "node:test";
import assert from "node:assert/strict";

const { toDocumentStatusDto, toUploadResultDto } = await import(
  "../src/services/uploads/uploadResult.dto.js"
);

test("upload result DTO hides object keys and exposes processing summary", () => {
  const result = toUploadResultDto({
    document: {
      _id: "upload_1",
      title: "Brief",
      originalFilename: "brief.md",
      downloadFilename: "brief.md",
      fileExtension: "md",
      mimeType: "text/markdown",
      fileKind: "markdown",
      scope: "user",
      sourceType: "upload",
      readOnly: false,
      status: "ready",
      lifecycleStatus: "active",
      sizeBytes: 8,
      objectKey: "demo-sessions/demo_123/uploads/upload_1/brief.md",
      contentStats: { chunkCount: 1 },
    },
    processing: { status: "completed", statusSequence: ["uploaded", "ready"], warnings: [] },
    usage: { uploadedFiles: 1 },
    remaining: { uploadedFiles: 4 },
  });

  assert.equal(result.document.downloadAvailable, true);
  assert.equal(result.document.searchable, true);
  assert.equal(result.document.attachable, true);
  assert.equal(result.processing.status, "completed");
  assert.equal("objectKey" in result.document, false);
  assert.equal(JSON.stringify(result).includes("demo-sessions/demo_123"), false);
});

test("document status DTO marks failed uploaded document downloadable but not searchable or attachable", () => {
  const dto = toDocumentStatusDto({
    _id: "upload_1",
    status: "failed",
    statusMessage: "Extraction failed.",
    lifecycleStatus: "active",
    scope: "user",
    sourceType: "upload",
    readOnly: false,
    storageProvider: "s3",
    objectKey: "demo-sessions/demo_123/uploads/upload_1/brief.md",
    contentStats: { chunkCount: 0 },
  });

  assert.equal(dto.downloadAvailable, true);
  assert.equal(dto.searchable, false);
  assert.equal(dto.attachable, false);
  assert.equal(dto.retryAvailable, true);
  assert.equal(dto.retryReason, null);
});

test("document status DTO reports safe retry reasons without storage internals", () => {
  const generated = toDocumentStatusDto({
    _id: "generated_1",
    status: "failed",
    lifecycleStatus: "active",
    scope: "generated",
    sourceType: "generated",
    readOnly: false,
    storageProvider: "s3",
    objectKey: "demo-sessions/demo_123/generated/generated_1/brief.md",
    contentStats: {},
  });
  const readyUpload = toDocumentStatusDto({
    _id: "upload_1",
    status: "ready",
    lifecycleStatus: "active",
    scope: "user",
    sourceType: "upload",
    readOnly: false,
    storageProvider: "s3",
    objectKey: "demo-sessions/demo_123/uploads/upload_1/brief.md",
    contentStats: { chunkCount: 1 },
  });

  assert.equal(generated.retryAvailable, false);
  assert.equal(generated.retryReason, "Only user uploaded documents can be retried.");
  assert.equal(readyUpload.retryAvailable, false);
  assert.equal(readyUpload.retryReason, "Ready upload documents require force=true to reprocess.");
  assert.equal(JSON.stringify(generated).includes("demo-sessions/demo_123"), false);
  assert.equal(JSON.stringify(readyUpload).includes("demo-sessions/demo_123"), false);
});
