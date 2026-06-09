import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const { extractDocxFile } = await import("../src/services/extraction/docxExtractor.service.js");

const sopPath = fileURLToPath(
  new URL("../mock-data/documents/02-document-operations/remote-approval-sop.docx", import.meta.url),
);

test("DOCX extractor returns optimized text and paragraph blocks", async () => {
  const result = await extractDocxFile({
    filePath: sopPath,
    originalFilename: "remote-approval-sop.docx",
  });

  assert.equal(result.fileKind, "docx");
  assert.match(result.optimizedText, /Remote Approval/i);
  assert.ok(result.sourceBlocks.length > 0);
  assert.ok(result.textPreview.length > 0);
});
