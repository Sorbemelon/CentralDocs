import { test } from "node:test";
import assert from "node:assert/strict";

const { formatReferencesForChatAnswer } = await import(
  "../src/services/rag/ragReferenceFormatter.service.js"
);

test("RAG reference formatter maps citations and caps visible references", () => {
  const refs = Array.from({ length: 7 }, (_, index) => ({
    citationNumber: index + 1,
    documentId: `doc_${index}`,
    documentTitle: `Document ${index}`,
    fileType: index === 0 ? "pdf" : "csv",
    folderName: "Workspace",
    chunkId: `chunk_${index}`,
    pageNumber: index === 0 ? 2 : null,
    slideNumber: index === 1 ? 4 : null,
    sheetName: index === 2 ? "Risks" : null,
    rowRange: index === 2 ? "5-9" : null,
    mediaTimestamp: index === 3 ? "12-18" : null,
    excerptPreview: "A".repeat(400),
    similarityScore: 0.9,
    objectKey: "mock/secret",
    embedding: [0.1],
    localPath: "D:/secret",
  }));

  const formatted = formatReferencesForChatAnswer({ references: refs });
  const serialized = JSON.stringify(formatted);

  assert.equal(formatted.length, 5);
  assert.equal(formatted[0].citationNumber, 1);
  assert.equal(formatted[0].usedFor, "chat answer evidence");
  assert.equal(formatted[0].excerptPreview.length, 300);
  assert.equal(formatted[2].sheetName, "Risks");
  assert.equal(formatted[3].mediaTimestamp, "12-18");
  assert.equal(serialized.includes("objectKey"), false);
  assert.equal(serialized.includes("embedding"), false);
  assert.equal(serialized.includes("localPath"), false);
});
