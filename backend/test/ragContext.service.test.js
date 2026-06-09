import { test } from "node:test";
import assert from "node:assert/strict";

const { buildRagContext } = await import("../src/services/rag/ragContext.service.js");

function selectionResolver({ selectedDocumentIds = [], selectedFolderIds = [] }) {
  return {
    selectedDocumentIds,
    selectedFolderIds,
    resolvedDocuments: selectedDocumentIds.map((id) => ({ id, title: id })),
    snapshots: {
      attachedDocumentSnapshot: selectedDocumentIds.map((id) => ({ id, title: id })),
      attachedFolderSnapshot: selectedFolderIds.map((id) => ({ id, name: id })),
      resolvedDocumentSnapshot: selectedDocumentIds.map((id) => ({ id, title: id })),
    },
  };
}

test("RAG context rejects missing selected documents and folders", async () => {
  await assert.rejects(
    () =>
      buildRagContext({
        chatSession: { currentSelectedDocumentIds: [], currentSelectedFolderIds: [] },
        userPrompt: "Question",
        demoSessionId: "demo_123",
        selectionResolver,
      }),
    { code: "CHAT_CONTEXT_REQUIRED" },
  );
});

test("RAG context uses current selection and calls semantic search with topK 6", async () => {
  let captured = null;
  const context = await buildRagContext({
    chatSession: { currentSelectedDocumentIds: ["doc_1"], currentSelectedFolderIds: [] },
    userPrompt: "Question",
    demoSessionId: "demo_123",
    selectionResolver,
    semanticSearcher: async (request) => {
      captured = request;
      return {
        references: [
          {
            citationNumber: 1,
            documentId: "doc_1",
            documentTitle: "Doc",
            chunkId: "chunk_1",
            excerptPreview: "Evidence",
          },
        ],
        results: [],
        scope: { resolvedDocumentIds: ["doc_1"] },
      };
    },
  });

  assert.deepEqual(captured.body.selectedDocumentIds, ["doc_1"]);
  assert.equal(captured.body.topK, 6);
  assert.equal(context.references[0].usedFor, "chat answer evidence");
});

test("RAG context applies message-level selection override", async () => {
  let captured = null;
  const context = await buildRagContext({
    chatSession: { currentSelectedDocumentIds: ["doc_1"], currentSelectedFolderIds: [] },
    body: { selectedDocumentIds: ["doc_2"], selectedFolderIds: ["folder_1"] },
    userPrompt: "Question",
    demoSessionId: "demo_123",
    selectionResolver,
    semanticSearcher: async (request) => {
      captured = request;
      return { references: [], results: [], scope: {} };
    },
  });

  assert.equal(context.hasOverride, true);
  assert.deepEqual(context.selection.selectedDocumentIds, ["doc_2"]);
  assert.deepEqual(captured.body.selectedFolderIds, ["folder_1"]);
  assert.deepEqual(context.references, []);
});
