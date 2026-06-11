import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.GEMINI_API_KEY_1 = "";
process.env.GEMINI_API_KEY_2 = "";
process.env.GEMINI_API_KEY_3 = "";
process.env.GEMINI_API_KEYS = "";

const { extractMockDocument } = await import(
  "../src/services/extraction/extractionRegistry.service.js"
);
const { loadMockManifest } = await import("../src/services/mockData/mockManifest.service.js");

test("mock extraction supports connected Orchid Retail markdown document", async () => {
  const result = await extractMockDocument({
    documentIdOrSlug: "01-strategy-rollout/centraldocs-transformation-brief.md",
  });

  assert.equal(result.fileKind, "markdown");
  assert.match(result.optimizedText, /Orchid Retail|CentralDocs/i);
  assert.equal(result.stats.sourceBlockCount > 0, true);
});

test("mock extraction supports PDF, DOCX, XLSX, PPTX, and media without chunks or embeddings", async () => {
  const manifest = await loadMockManifest();
  const targets = [
    "document-management-policy.pdf",
    "remote-approval-sop.docx",
    "invoice-tracking-sample.xlsx",
    "digital-workspace-rollout-plan.pptx",
    "rollout-risk-discussion.mp3",
    "staff-training-demo.mp4",
    "intake-to-ai-search-workflow.png",
  ];

  for (const filename of targets) {
    const document = manifest.documents.find((candidate) => candidate.filename === filename);
    const result = await extractMockDocument({
      documentIdOrSlug: `${document.folderSlug}/${document.filename}`,
    });

    assert.equal(result.fileKind, document.fileKind);
    assert.equal(Array.isArray(result.sourceBlocks), true);
    assert.equal("embedding" in result, false);
    assert.equal("chunks" in result, false);
    assert.equal("documentChunks" in result, false);
  }
});
