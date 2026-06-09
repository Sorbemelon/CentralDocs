import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const {
  extractFile,
  extractMockDocument,
  getExtractorForFileKind,
} = await import("../src/services/extraction/extractionRegistry.service.js");

const briefPath = fileURLToPath(
  new URL("../mock-data/documents/01-strategy-rollout/centraldocs-transformation-brief.md", import.meta.url),
);

test("extraction registry routes file kinds to extractors", () => {
  for (const kind of ["text", "markdown", "csv", "tsv", "pdf", "docx", "xlsx", "pptx", "image", "audio", "video"]) {
    assert.equal(typeof getExtractorForFileKind(kind), "function");
  }
});

test("extraction registry rejects unsupported file kinds", async () => {
  await assert.rejects(
    () =>
      extractFile({
        filePath: "archive.zip",
        originalFilename: "archive.zip",
        source: "mock",
      }),
    {
      statusCode: 400,
      code: "UNSUPPORTED_FILE_TYPE",
    },
  );
});

test("extraction registry extracts known mock docs through file routing", async () => {
  const result = await extractFile({
    filePath: briefPath,
    originalFilename: "centraldocs-transformation-brief.md",
    source: "mock",
  });

  assert.equal(result.fileKind, "markdown");
  assert.match(result.optimizedText, /CentralDocs Transformation Brief/);
});

test("extraction registry extracts known mock docs by stable slug", async () => {
  const result = await extractMockDocument({
    documentIdOrSlug: "01-strategy-rollout/centraldocs-transformation-brief.md",
  });

  assert.equal(result.fileKind, "markdown");
  assert.match(result.optimizedText, /CentralDocs Transformation Brief/);
});
