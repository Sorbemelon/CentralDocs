import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const { extractPptxFile } = await import("../src/services/extraction/pptxExtractor.service.js");

const rolloutPath = fileURLToPath(
  new URL("../mock-data/documents/01-strategy-rollout/digital-workspace-rollout-plan.pptx", import.meta.url),
);

test("PPTX extractor safely extracts slide text or partial warning", async () => {
  const result = await extractPptxFile({
    filePath: rolloutPath,
    originalFilename: "digital-workspace-rollout-plan.pptx",
  });

  assert.equal(result.fileKind, "pptx");
  assert.ok(result.sourceBlocks.length > 0 || result.warnings.length > 0);
  if (result.sourceBlocks.length > 0) {
    assert.ok(result.sourceBlocks.every((block) => block.locator.slideNumber));
  } else {
    assert.equal(result.warnings[0].code, "PPTX_EXTRACTION_PARTIAL");
  }
});
