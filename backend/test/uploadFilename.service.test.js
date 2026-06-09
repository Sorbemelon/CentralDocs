import { test } from "node:test";
import assert from "node:assert/strict";

const { normalizeUploadFilename } = await import(
  "../src/services/uploads/uploadFilename.service.js"
);

test("upload filename sanitizes safe names and preserves extension", () => {
  const result = normalizeUploadFilename({
    originalFilename: "Risk Register Final.csv",
    fileKind: "csv",
  });

  assert.equal(result.downloadFilename, "Risk_Register_Final.csv");
  assert.equal(result.fileExtension, "csv");
  assert.equal(result.title, "Risk Register Final");
});

test("upload filename rejects path traversal and separators", () => {
  for (const originalFilename of ["../secret.md", "folder/secret.md", "folder\\secret.md"]) {
    assert.throws(
      () => normalizeUploadFilename({ originalFilename, fileKind: "markdown" }),
      { code: "UPLOAD_UNSUPPORTED_FILE_TYPE" },
    );
  }
});

test("upload filename caps long names and derives safe title", () => {
  const result = normalizeUploadFilename({
    originalFilename: `${"a".repeat(200)}.txt`,
    fileKind: "text",
    title: "  Custom / Unsafe <Title>  ",
  });

  assert.equal(result.downloadFilename.length, 120);
  assert.equal(result.downloadFilename.endsWith(".txt"), true);
  assert.equal(result.title, "Custom Unsafe Title");
});

test("upload filename rejects extension mismatch and empty basename", () => {
  assert.throws(
    () => normalizeUploadFilename({ originalFilename: "brief.pdf", fileKind: "text" }),
    { code: "UPLOAD_UNSUPPORTED_FILE_TYPE" },
  );
  assert.throws(
    () => normalizeUploadFilename({ originalFilename: ".md", fileKind: "markdown" }),
    { code: "UPLOAD_UNSUPPORTED_FILE_TYPE" },
  );
});
