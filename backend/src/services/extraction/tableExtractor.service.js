import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { EXTRACTION_FILE_KIND } from "../../constants/extraction.constants.js";
import { EXTRACTION_LIMITS } from "../../constants/extraction.constants.js";
import { buildExtractionResult, makeSourceBlock } from "./extractionResult.dto.js";
import { appendWarning, getTableRowLimit } from "./extractionLimit.service.js";
import { compressLongText } from "./normalizeText.service.js";

function titleFromFilename(filename = "") {
  return path.basename(filename, path.extname(filename)) || "Table document";
}

function compactRecord(headers = [], row = [], rowNumber) {
  const values = headers.map((header, index) => {
    const safeHeader = header || `Column ${index + 1}`;
    const value = row[index] ?? "";
    return `${safeHeader} = ${compressLongText(value, 140)}`;
  });

  return `Row ${rowNumber}: ${values.join("; ")}.`;
}

export function buildCompactTableBlocks({
  rows = [],
  delimiter = ",",
  sheetName = null,
  startRowNumber = 1,
  maxRows = EXTRACTION_LIMITS.maxTableRowsPerSheet,
  warnings = [],
} = {}) {
  const parsedRows = Array.isArray(rows) ? rows : [];
  if (parsedRows.length === 0) {
    return {
      blocks: [],
      text: "",
      truncated: false,
    };
  }

  const headers = parsedRows[0].map((header, index) => String(header || `Column ${index + 1}`).trim());
  const rowLimit = getTableRowLimit(maxRows);
  const dataRows = parsedRows.slice(1, rowLimit + 1);
  const truncated = parsedRows.length - 1 > rowLimit;
  if (truncated) {
    appendWarning(
      warnings,
      "TABLE_ROWS_TRUNCATED",
      `Table rows were limited to ${rowLimit}.`,
      sheetName ? { sheetName } : undefined,
    );
  }

  const headerText = `Headers: ${headers.join("; ")}.`;
  const blocks = [
    makeSourceBlock({
      blockIndex: 0,
      blockType: "table_header",
      text: headerText,
      locator: {
        ...(sheetName ? { sheetName } : {}),
        rowStart: startRowNumber,
        rowEnd: startRowNumber,
      },
      metadata: { delimiter },
    }),
  ];

  for (const [index, row] of dataRows.entries()) {
    const rowNumber = startRowNumber + index + 1;
    blocks.push(
      makeSourceBlock({
        blockIndex: blocks.length,
        blockType: "table_row",
        text: compactRecord(headers, row, rowNumber),
        locator: {
          ...(sheetName ? { sheetName } : {}),
          rowStart: rowNumber,
          rowEnd: rowNumber,
        },
      }),
    );
  }

  return {
    blocks,
    text: blocks.map((block) => block.text).join("\n"),
    truncated,
  };
}

export async function extractDelimitedTableFile({
  filePath,
  originalFilename = path.basename(filePath),
  fileKind = null,
  delimiter = null,
  maxRows = EXTRACTION_LIMITS.maxTableRowsPerSheet,
} = {}) {
  const inferredKind = fileKind || (originalFilename.toLowerCase().endsWith(".tsv")
    ? EXTRACTION_FILE_KIND.TSV
    : EXTRACTION_FILE_KIND.CSV);
  const resolvedDelimiter = delimiter || (inferredKind === EXTRACTION_FILE_KIND.TSV ? "\t" : ",");
  const warnings = [];
  const raw = await readFile(filePath, "utf8");
  const rows = parse(raw, {
    delimiter: resolvedDelimiter,
    relax_column_count: true,
    skip_empty_lines: true,
    bom: true,
  });
  const table = buildCompactTableBlocks({
    rows,
    delimiter: resolvedDelimiter,
    maxRows,
    warnings,
  });

  return buildExtractionResult({
    title: titleFromFilename(originalFilename),
    fileKind: inferredKind,
    originalFilename,
    extractedText: table.text,
    sourceBlocks: table.blocks,
    warnings,
    truncated: table.truncated,
  });
}
