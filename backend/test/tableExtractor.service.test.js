import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const {
  buildCompactTableBlocks,
  extractDelimitedTableFile,
} = await import("../src/services/extraction/tableExtractor.service.js");

const csvPath = fileURLToPath(
  new URL("../mock-data/documents/04-customer-support-signals/customer-feedback-export.csv", import.meta.url),
);
const tsvPath = fileURLToPath(
  new URL("../mock-data/documents/02-document-operations/support-knowledge-playbook.tsv", import.meta.url),
);

test("CSV extractor preserves headers, compact rows, and row locators", async () => {
  const result = await extractDelimitedTableFile({
    filePath: csvPath,
    originalFilename: "customer-feedback-export.csv",
  });

  assert.equal(result.fileKind, "csv");
  assert.match(result.optimizedText, /Headers:/);
  assert.match(result.optimizedText, /Row 2:/);
  assert.ok(result.sourceBlocks.some((block) => block.locator.rowStart === 2));
});

test("TSV extractor preserves headers and compact rows", async () => {
  const result = await extractDelimitedTableFile({
    filePath: tsvPath,
    originalFilename: "support-knowledge-playbook.tsv",
  });

  assert.equal(result.fileKind, "tsv");
  assert.match(result.optimizedText, /Headers:/);
  assert.ok(result.sourceBlocks.length > 1);
});

test("table extractor truncates large table fixtures", () => {
  const warnings = [];
  const rows = [
    ["Vendor", "Status", "Risk"],
    ...Array.from({ length: 105 }, (_, index) => [
      `Vendor ${index}`,
      "Pending",
      "Missing approval owner",
    ]),
  ];
  const table = buildCompactTableBlocks({ rows, maxRows: 10, warnings });

  assert.equal(table.truncated, true);
  assert.equal(table.blocks.length, 11);
  assert.equal(warnings[0].code, "TABLE_ROWS_TRUNCATED");
});
