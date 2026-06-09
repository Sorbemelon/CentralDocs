import { test } from "node:test";
import assert from "node:assert/strict";

const { collectGeneratedDocumentReferences } = await import(
  "../src/services/generatedDocuments/generatedDocumentReference.service.js"
);

test("generated document reference service collects and deduplicates assistant references", () => {
  const result = collectGeneratedDocumentReferences({
    messages: [
      {
        id: "message_1",
        role: "assistant",
        referencesUsed: [
          {
            citationNumber: 3,
            documentId: "mock_doc_1",
            documentTitle: "Risk Register",
            fileType: "csv",
            folderName: "Operations",
            chunkId: "chunk_1",
            excerptPreview: "Approval ownership is unresolved.",
          },
          {
            citationNumber: 4,
            documentId: "mock_doc_1",
            documentTitle: "Risk Register",
            chunkId: "chunk_1",
            excerptPreview: "Duplicate reference.",
          },
        ],
      },
    ],
  });

  assert.equal(result.references.length, 1);
  assert.equal(result.references[0].citationNumber, 1);
  assert.deepEqual(result.sourceMessageIds, ["message_1"]);
  assert.deepEqual(result.sourceDocumentIds, ["mock_doc_1"]);
  assert.match(result.promptReferences[0].label, /\[1\]/);
});

test("generated document reference service hides storage keys, embeddings, paths, and long excerpts", () => {
  const result = collectGeneratedDocumentReferences({
    messages: [
      {
        id: "message_1",
        referencesUsed: [
          {
            documentId: "doc_1",
            documentTitle: "Stored Doc",
            chunkId: "chunk_1",
            excerptPreview: `${"x".repeat(700)} demo-sessions/demo_1/generated/doc/file.md C:\\Users\\Me\\file.md`,
            embedding: [1, 2, 3],
            objectKey: "demo-sessions/demo_1/generated/doc/file.md",
          },
        ],
      },
    ],
  });

  assert.equal(result.references[0].excerptPreview.length <= 503, true);
  assert.equal(JSON.stringify(result).includes("demo-sessions/demo_1"), false);
  assert.equal(JSON.stringify(result).includes("C:\\Users\\Me"), false);
  assert.equal(JSON.stringify(result).includes("embedding"), false);
  assert.equal(JSON.stringify(result).includes("objectKey"), false);
});

test("generated document reference service can omit references while keeping message ids", () => {
  const result = collectGeneratedDocumentReferences({
    includeReferences: false,
    messages: [{ id: "message_1", referencesUsed: [{ documentId: "doc_1" }] }],
  });

  assert.deepEqual(result.references, []);
  assert.deepEqual(result.sourceMessageIds, ["message_1"]);
  assert.deepEqual(result.sourceDocumentIds, []);
});
