import { test } from "node:test";
import assert from "node:assert/strict";

const { buildRagPrompt } = await import("../src/services/rag/ragPromptBuilder.service.js");

test("RAG prompt builder includes question, history, selection, references, and citation rules", () => {
  const built = buildRagPrompt({
    userQuestion: "What are the rollout risks?",
    selection: {
      resolvedDocuments: [{ id: "doc_1", title: "Rollout Plan", fileKind: "pptx" }],
    },
    history: {
      rollingSummary: "We discussed adoption blockers.",
      recentMessages: [{ role: "user", content: "Earlier question", createdAt: null }],
    },
    references: [
      {
        citationNumber: 1,
        documentTitle: "Rollout Plan",
        fileType: "pptx",
        folderName: "Strategy",
        excerptPreview: "Training adoption is a risk.",
        objectKey: "mock/secret",
        embedding: [0.1],
      },
    ],
  });
  const combined = `${built.systemInstruction}\n${built.prompt}`;

  assert.ok(combined.includes("What are the rollout risks?"));
  assert.ok(combined.includes("We discussed adoption blockers."));
  assert.ok(combined.includes("Rollout Plan"));
  assert.ok(combined.includes("[1]"));
  assert.ok(combined.includes("Do not invent"));
  assert.ok(combined.includes("Cite document evidence inline"));
  assert.equal(combined.includes("objectKey"), false);
  assert.equal(combined.includes("embedding"), false);
  assert.equal(combined.includes("mock/secret"), false);
});
