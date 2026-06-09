import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const { extractPdfFile } = await import("../src/services/extraction/pdfExtractor.service.js");

const policyPath = fileURLToPath(
  new URL("../mock-data/documents/02-document-operations/document-management-policy.pdf", import.meta.url),
);

test("PDF extractor extracts mock PDF text with page locators", async () => {
  const result = await extractPdfFile({
    filePath: policyPath,
    originalFilename: "document-management-policy.pdf",
  });

  assert.equal(result.fileKind, "pdf");
  assert.ok(result.optimizedText.length > 0);
  assert.ok(result.sourceBlocks.length > 0);
  assert.ok(result.sourceBlocks.some((block) => block.locator.pageNumber));
  assert.equal(result.stats.estimatedTokenCount > 0, true);
});
