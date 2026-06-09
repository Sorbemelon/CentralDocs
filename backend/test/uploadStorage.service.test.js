import { test } from "node:test";
import assert from "node:assert/strict";

const {
  deleteUploadedObject,
  readUploadedObjectBuffer,
  saveUploadObject,
} = await import("../src/services/uploads/uploadStorage.service.js");

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

test("upload storage reads uploaded object buffers through S3 adapter", async () => {
  let captured = null;
  const buffer = await readUploadedObjectBuffer({
    objectKey: "demo-sessions/demo_123/uploads/upload_1/brief.md",
    storage: {
      getObjectBuffer: async (input) => {
        captured = input;
        return Buffer.from("# Brief");
      },
    },
  });

  assert.equal(buffer.toString("utf8"), "# Brief");
  assert.equal(captured.objectKey, "demo-sessions/demo_123/uploads/upload_1/brief.md");
});

test("upload storage cleanup deletes only safe uploaded original keys", async () => {
  let deletedKey = null;
  const result = await deleteUploadedObject({
    objectKey: "demo-sessions/demo_123/uploads/upload_1/brief.md",
    storage: {
      deleteObject: async ({ objectKey }) => {
        deletedKey = objectKey;
        return { deleted: true };
      },
    },
  });

  assert.equal(result.deleted, true);
  assert.equal(deletedKey, "demo-sessions/demo_123/uploads/upload_1/brief.md");

  for (const objectKey of [
    "mock/orchid-retail/original/doc/report.md",
    "demo-sessions/demo_123/generated/doc/report.md",
    "demo-sessions/demo_123/uploads/../report.md",
  ]) {
    await assert.rejects(
      () =>
        deleteUploadedObject({
          objectKey,
          storage: { deleteObject: async () => ({ deleted: true }) },
        }),
      { code: "INVALID_STORAGE_KEY" },
    );
  }
});

test("upload storage read maps missing stored originals safely", async () => {
  await assert.rejects(
    () =>
      readUploadedObjectBuffer({
        objectKey: "demo-sessions/demo_123/uploads/upload_1/missing.md",
        storage: {
          getObjectBuffer: async () => {
            const error = new Error("missing hidden/key");
            error.code = "STORAGE_OBJECT_NOT_FOUND";
            error.statusCode = 404;
            throw error;
          },
        },
      }),
    { code: "STORAGE_OBJECT_NOT_FOUND", statusCode: 404 },
  );
});
