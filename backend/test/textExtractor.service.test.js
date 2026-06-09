import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const { extractTextFile } = await import("../src/services/extraction/textExtractor.service.js");

test("text extractor reads UTF-8 text and strips null bytes", async () => {
  const tempDir = path.join(os.tmpdir(), "centraldocs-extraction-tests");
  await mkdir(tempDir, { recursive: true });
  const filePath = path.join(tempDir, "plain.txt");
  await writeFile(filePath, "CentralDocs\u0000 text\n\nCentralDocs text", "utf8");

  const result = await extractTextFile({ filePath, originalFilename: "plain.txt" });

  assert.equal(result.fileKind, "text");
  assert.equal(result.title, "plain");
  assert.match(result.optimizedText, /CentralDocs text/);
  assert.equal(result.optimizedText.includes("\u0000"), false);
  assert.ok(result.textPreview.length > 0);
  assert.ok(result.sourceBlocks.length > 0);
});
