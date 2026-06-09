import { test } from "node:test";
import assert from "node:assert/strict";

const {
  buildSearchReference,
  buildSearchReferences,
} = await import("../src/services/search/searchReference.service.js");

test("search reference builder maps page and slide locators", () => {
  const pageRef = buildSearchReference({
    citationNumber: 1,
    document: {
      id: "doc_pdf",
      title: "Policy",
      fileKind: "pdf",
      folderName: "Operations",
    },
    match: {
      chunkId: "chunk_pdf",
      content: "A".repeat(400),
      score: 0.88,
      sourceLocator: { pageNumber: 4, sectionTitle: "Retention" },
    },
  });
  const slideRef = buildSearchReference({
    citationNumber: 2,
    document: {
      id: "doc_pptx",
      title: "Rollout",
      fileKind: "pptx",
      folderName: "Strategy",
    },
    match: {
      chunkId: "chunk_pptx",
      content: "Slide notes",
      score: 0.77,
      sourceLocator: { slideNumber: 6 },
    },
  });

  assert.equal(pageRef.citationNumber, 1);
  assert.equal(pageRef.documentTitle, "Policy");
  assert.equal(pageRef.pageNumber, 4);
  assert.equal(pageRef.sectionTitle, "Retention");
  assert.equal(pageRef.excerptPreview.length, 300);
  assert.equal(slideRef.slideNumber, 6);
  assert.equal(slideRef.usedFor, "semantic search match");
});

test("search reference builder maps sheet row ranges and media timestamps", () => {
  const refs = buildSearchReferences({
    documentsById: new Map([
      ["doc_sheet", { id: "doc_sheet", title: "Invoice Tracker", fileKind: "xlsx", folderName: "Finance" }],
      ["doc_audio", { id: "doc_audio", title: "Risk Discussion", fileKind: "audio", folderName: "Meetings" }],
    ]),
    matches: [
      {
        chunkId: "chunk_sheet",
        documentId: "doc_sheet",
        content: "Row 5: Status = Pending.",
        score: 0.91,
        sourceLocator: { sheetName: "Invoices", rowStart: 5, rowEnd: 9 },
      },
      {
        chunkId: "chunk_audio",
        documentId: "doc_audio",
        content: "Training risks discussed.",
        score: 0.86,
        sourceLocator: { mediaTimestampStart: 12, mediaTimestampEnd: 30 },
      },
    ],
  });

  assert.equal(refs[0].citationNumber, 1);
  assert.equal(refs[0].sheetName, "Invoices");
  assert.equal(refs[0].rowRange, "5-9");
  assert.equal(refs[1].citationNumber, 2);
  assert.equal(refs[1].mediaTimestamp, "12-30");
  assert.equal(JSON.stringify(refs).includes("objectKey"), false);
  assert.equal(JSON.stringify(refs).includes("D:\\"), false);
});
