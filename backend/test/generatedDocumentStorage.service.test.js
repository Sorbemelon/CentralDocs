import { test } from "node:test";
import assert from "node:assert/strict";

const { saveGeneratedDocumentObject } = await import(
  "../src/services/generatedDocuments/generatedDocumentStorage.service.js"
);

test("generated document storage writes Markdown under generated session prefix", async () => {
  let captured = null;
  const result = await saveGeneratedDocumentObject({
    demoSessionId: "demo_123",
    documentId: "doc_123",
    filename: "brief.md",
    content: "# Brief",
    contentType: "text/markdown; charset=utf-8",
    storage: {
      putObject: async (input) => {
        captured = input;
        return { etag: '"etag"', bucketConfigured: true };
      },
    },
  });

  assert.equal(
    captured.objectKey,
    "demo-sessions/demo_123/generated/doc_123/brief.md",
  );
  assert.equal(captured.contentType, "text/markdown; charset=utf-8");
  assert.equal(Buffer.isBuffer(captured.body), true);
  assert.equal(result.objectKey, "demo-sessions/demo_123/generated/doc_123/brief.md");
});

test("generated document storage writes text with plain text content type", async () => {
  let captured = null;
  await saveGeneratedDocumentObject({
    demoSessionId: "demo_123",
    documentId: "doc_123",
    filename: "brief.txt",
    content: "Brief",
    contentType: "text/plain; charset=utf-8",
    storage: {
      putObject: async (input) => {
        captured = input;
        return {};
      },
    },
  });

  assert.equal(captured.contentType, "text/plain; charset=utf-8");
});

test("generated document storage rejects unsafe generated keys and propagates storage config errors", async () => {
  await assert.rejects(
    () =>
      saveGeneratedDocumentObject({
        demoSessionId: "../demo",
        documentId: "doc_123",
        filename: "brief.md",
        content: "Brief",
        contentType: "text/markdown; charset=utf-8",
        storage: { putObject: async () => ({}) },
      }),
    { code: "INVALID_STORAGE_KEY" },
  );

  await assert.rejects(
    () =>
      saveGeneratedDocumentObject({
        demoSessionId: "demo_123",
        documentId: "doc_123",
        filename: "brief.md",
        content: "Brief",
        contentType: "text/markdown; charset=utf-8",
        storage: {
          putObject: async () => {
            const error = new Error("storage unavailable");
            error.statusCode = 503;
            error.code = "STORAGE_NOT_CONFIGURED";
            throw error;
          },
        },
      }),
    { code: "STORAGE_NOT_CONFIGURED" },
  );
});
