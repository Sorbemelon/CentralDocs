import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const { extractMarkdownFile } = await import(
  "../src/services/extraction/markdownExtractor.service.js"
);

const briefPath = fileURLToPath(
  new URL("../mock-data/documents/01-strategy-rollout/centraldocs-transformation-brief.md", import.meta.url),
);

test("markdown extractor preserves headings and section locators", async () => {
  const result = await extractMarkdownFile({
    filePath: briefPath,
    originalFilename: "centraldocs-transformation-brief.md",
  });

  assert.equal(result.fileKind, "markdown");
  assert.match(result.optimizedText, /CentralDocs Transformation Brief/);
  assert.ok(result.sourceBlocks.some((block) => block.locator.sectionTitle));
  assert.ok(result.textPreview.length > 0);
});
