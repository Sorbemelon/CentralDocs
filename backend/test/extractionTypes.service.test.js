import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const {
  assertSupportedExtractionType,
  getFileKindFromFilename,
  isMockOnlyExtractionType,
  isPublicUploadExtractionType,
  isSupportedExtractionType,
} = await import("../src/services/extraction/extractionTypes.service.js");

test("extraction type detection supports public upload types", () => {
  assert.equal(getFileKindFromFilename("notes.txt"), "text");
  assert.equal(getFileKindFromFilename("brief.md"), "markdown");
  assert.equal(getFileKindFromFilename("data.csv"), "csv");
  assert.equal(getFileKindFromFilename("playbook.tsv"), "tsv");
  assert.equal(getFileKindFromFilename("policy.pdf"), "pdf");
  assert.equal(getFileKindFromFilename("sop.docx"), "docx");

  for (const kind of ["text", "markdown", "csv", "tsv", "pdf", "docx"]) {
    assert.equal(isPublicUploadExtractionType(kind), true);
    assert.equal(assertSupportedExtractionType(kind, { source: "public_upload" }), kind);
  }
});

test("public upload rejects mock-only rich media and office types", () => {
  for (const kind of ["xlsx", "pptx", "image", "audio", "video"]) {
    assert.equal(isMockOnlyExtractionType(kind), true);
    assert.throws(() => assertSupportedExtractionType(kind, { source: "public_upload" }), {
      statusCode: 400,
      code: "UNSUPPORTED_FILE_TYPE",
    });
  }
});

test("mock source accepts mock-only extraction types", () => {
  for (const kind of ["xlsx", "pptx", "image", "audio", "video"]) {
    assert.equal(isSupportedExtractionType(kind), true);
    assert.equal(assertSupportedExtractionType(kind, { source: "mock" }), kind);
  }
});

test("unsupported executable and archive types are rejected", () => {
  assert.equal(getFileKindFromFilename("malware.exe"), null);
  assert.equal(getFileKindFromFilename("archive.zip"), null);
  assert.throws(() => assertSupportedExtractionType(null, { source: "mock" }), {
    statusCode: 400,
    code: "UNSUPPORTED_FILE_TYPE",
  });
});
