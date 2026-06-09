import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const { extractSpreadsheetFile } = await import(
  "../src/services/extraction/spreadsheetExtractor.service.js"
);

const invoicePath = fileURLToPath(
  new URL("../mock-data/documents/03-finance-vendors/invoice-tracking-sample.xlsx", import.meta.url),
);

test("XLSX extractor includes sheet names and compact row summaries", async () => {
  const result = await extractSpreadsheetFile({
    filePath: invoicePath,
    originalFilename: "invoice-tracking-sample.xlsx",
  });

  assert.equal(result.fileKind, "xlsx");
  assert.match(result.optimizedText, /Sheet/i);
  assert.match(result.optimizedText, /Row 2:/);
  assert.ok(result.sourceBlocks.some((block) => block.locator.sheetName));
  assert.ok(result.sourceBlocks.some((block) => block.locator.rowStart));
});
