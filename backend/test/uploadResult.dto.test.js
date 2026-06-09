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
    objectKey: "demo-sessions/demo_123/uploads/upload_1/brief.md",
    contentStats: { chunkCount: 0 },
  });

  assert.equal(dto.downloadAvailable, true);
  assert.equal(dto.searchable, false);
  assert.equal(dto.attachable, false);
});
