import { test } from "node:test";
import assert from "node:assert/strict";

const { saveUploadObject } = await import("../src/services/uploads/uploadStorage.service.js");

test("upload storage builds upload key and uses content type", async () => {
  let captured = null;
  const result = await saveUploadObject({
    demoSessionId: "demo_123",
    documentId: "doc_123",
    filename: "brief.md",
    buffer: Buffer.from("# Brief"),
    contentType: "text/markdown",
    storage: {
      putObject: async (input) => {
        captured = input;
        return { etag: '"etag"', bucketConfigured: true };
      },
    },
  });

  assert.equal(captured.objectKey, "demo-sessions/demo_123/uploads/doc_123/brief.md");
  assert.equal(captured.contentType, "text/markdown");
  assert.equal(result.objectKey, "demo-sessions/demo_123/uploads/doc_123/brief.md");
  assert.equal(result.storageProvider, "s3");
});

test("upload storage rejects unsafe key input and maps storage configuration errors", async () => {
  await assert.rejects(
    () =>
      saveUploadObject({
        demoSessionId: "../demo",
        documentId: "doc_123",
        filename: "brief.md",
        buffer: Buffer.from("Brief"),
        contentType: "text/markdown",
        storage: { putObject: async () => ({}) },
      }),
    { code: "INVALID_STORAGE_KEY" },
  );

  await assert.rejects(
    () =>
      saveUploadObject({
        demoSessionId: "demo_123",
        documentId: "doc_123",
        filename: "brief.md",
        buffer: Buffer.from("Brief"),
        contentType: "text/markdown",
        storage: {
          putObject: async () => {
            const error = new Error("storage unavailable");
            error.code = "STORAGE_NOT_CONFIGURED";
            error.statusCode = 503;
            throw error;
          },
        },
      }),
    { code: "UPLOAD_STORAGE_NOT_CONFIGURED" },
  );
});
