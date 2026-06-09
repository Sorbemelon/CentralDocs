import { test } from "node:test";
import assert from "node:assert/strict";

const {
  assertSafeObjectKey,
  buildDemoUploadObjectKey,
  buildGeneratedDocumentObjectKey,
  buildMockObjectKey,
  isSafeObjectKey,
  sanitizeFilename,
} = await import("../src/services/storage/s3ObjectKeys.js");

test("sanitizeFilename preserves normal filename and safe extension", () => {
  assert.equal(sanitizeFilename("brief.md"), "brief.md");
  assert.equal(sanitizeFilename("Invoice Report.PDF"), "Invoice_Report.PDF");
});

test("sanitizeFilename replaces spaces and special characters", () => {
  assert.equal(sanitizeFilename("Q2 vendor report (final)!.xlsx"), "Q2_vendor_report_final_.xlsx");
});

test("sanitizeFilename rejects traversal and leading path input", () => {
  assert.throws(() => sanitizeFilename("../secret.md"), {
    code: "INVALID_STORAGE_KEY",
  });
  assert.throws(() => sanitizeFilename("/secret.md"), {
    code: "INVALID_STORAGE_KEY",
  });
  assert.throws(() => sanitizeFilename("nested\\secret.md"), {
    code: "INVALID_STORAGE_KEY",
  });
});

test("object key safety rejects traversal, backslashes, leading slash, and empty segments", () => {
  assert.equal(isSafeObjectKey("mock/orchid/original/doc/file.md"), true);
  assert.equal(isSafeObjectKey("../file.md"), false);
  assert.equal(isSafeObjectKey("/mock/orchid/file.md"), false);
  assert.equal(isSafeObjectKey("mock\\orchid\\file.md"), false);
  assert.equal(isSafeObjectKey("mock//file.md"), false);
  assert.throws(() => assertSafeObjectKey("/mock/orchid/file.md"), {
    code: "INVALID_STORAGE_KEY",
  });
});

test("buildMockObjectKey uses expected key pattern", () => {
  assert.equal(
    buildMockObjectKey({
      workspaceId: "orchid-retail",
      documentId: "mock_document_brief",
      filename: "brief.md",
    }),
    "mock/orchid-retail/original/mock_document_brief/brief.md",
  );
});

test("buildDemoUploadObjectKey uses expected key pattern", () => {
  assert.equal(
    buildDemoUploadObjectKey({
      demoSessionId: "demo_abc",
      documentId: "64b64b64b64b64b64b64b64b",
      filename: "remote policy.pdf",
    }),
    "demo-sessions/demo_abc/uploads/64b64b64b64b64b64b64b64b/remote_policy.pdf",
  );
});

test("buildGeneratedDocumentObjectKey uses expected key pattern", () => {
  assert.equal(
    buildGeneratedDocumentObjectKey({
      demoSessionId: "demo_abc",
      documentId: "generated_doc_1",
      filename: "summary.md",
    }),
    "demo-sessions/demo_abc/generated/generated_doc_1/summary.md",
  );
});
