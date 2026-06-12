import { test } from "node:test";
import assert from "node:assert/strict";

const { formatReferencesForChatAnswer } = await import(
  "../src/services/rag/ragReferenceFormatter.service.js"
);

test("RAG reference formatter maps citations and caps visible references", () => {
  const refs = Array.from({ length: 12 }, (_, index) => ({
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

  assert.equal(formatted.length, 10);
  assert.equal(formatted[0].citationNumber, 1);
  assert.equal(formatted[0].usedFor, "chat answer evidence");
  assert.equal(formatted[0].excerptPreview.length, 300);
  assert.equal(formatted[2].sheetName, "Risks");
  assert.equal(formatted[3].mediaTimestamp, "12-18");
  assert.equal(serialized.includes("objectKey"), false);
  assert.equal(serialized.includes("embedding"), false);
  assert.equal(serialized.includes("localPath"), false);
});

test("RAG reference formatter dedupes and preserves grouped citation metadata", () => {
  const refs = [
    {
      citationNumber: 1,
      documentId: "doc_1",
      documentTitle: "Rollout Plan",
      chunkId: "chunk_1",
      excerptPreview: "Risk one.",
    },
    {
      citationNumber: 2,
      documentId: "doc_2",
      documentTitle: "Risk Register",
      chunkId: "chunk_2",
      excerptPreview: "Risk two.",
    },
    {
      citationNumber: 2,
      documentId: "doc_2",
      documentTitle: "Risk Register",
      chunkId: "chunk_2",
      excerptPreview: "Duplicate risk two.",
    },
    {
      citationNumber: 3,
      documentId: "doc_3",
      documentTitle: "Training Notes",
      chunkId: "chunk_3",
      excerptPreview: "Risk three.",
    },
  ];

  const grouped = formatReferencesForChatAnswer({
    references: refs,
    answerText: "The rollout risks are adoption [1, 2] and training [2-3].",
  });

  assert.deepEqual(grouped.map((ref) => ref.citationNumber), [1, 2, 3]);
  assert.deepEqual(grouped.map((ref) => ref.documentId), ["doc_1", "doc_2", "doc_3"]);
});

test("RAG reference formatter fills uncited evidence up to the visible limit", () => {
  const refs = Array.from({ length: 12 }, (_, index) => ({
    citationNumber: index + 1,
    documentId: `doc_${index + 1}`,
    documentTitle: `Document ${index + 1}`,
    chunkId: `chunk_${index + 1}`,
    excerptPreview: `Evidence ${index + 1}.`,
  }));

  const formatted = formatReferencesForChatAnswer({
    references: refs,
    answerText: "The selected documents describe rollout risk themes [1-5].",
  });

  assert.equal(formatted.length, 10);
  assert.deepEqual(formatted.map((ref) => ref.citationNumber), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});
