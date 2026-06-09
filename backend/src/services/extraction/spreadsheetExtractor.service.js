import path from "node:path";
import XLSX from "xlsx";
import { EXTRACTION_FILE_KIND, EXTRACTION_LIMITS } from "../../constants/extraction.constants.js";
import { buildExtractionResult, makeSourceBlock } from "./extractionResult.dto.js";
import { appendWarning, getSheetLimit, getTableRowLimit } from "./extractionLimit.service.js";
import { compressLongText } from "./normalizeText.service.js";

function titleFromFilename(filename = "") {
  return path.basename(filename, path.extname(filename)) || "Spreadsheet document";
}

function compactSheetRow(headers, row, rowNumber) {
  const pairs = headers.map((header, index) => {
    const value = row[index] ?? "";
    return `${header || `Column ${index + 1}`} = ${compressLongText(value, 140)}`;
  });

  return `Row ${rowNumber}: ${pairs.join("; ")}.`;
}

export async function extractSpreadsheetFile({
  filePath,
  originalFilename = path.basename(filePath),
  maxSheets = EXTRACTION_LIMITS.maxXlsxSheets,
  maxRows = EXTRACTION_LIMITS.maxTableRowsPerSheet,
} = {}) {
  const warnings = [];
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheetLimit = getSheetLimit(maxSheets);
  const rowLimit = getTableRowLimit(maxRows);
  const sheetNames = workbook.SheetNames.slice(0, sheetLimit);

  if (workbook.SheetNames.length > sheetLimit) {
    appendWarning(
      warnings,
      "XLSX_SHEETS_TRUNCATED",
      `Spreadsheet extraction was limited to ${sheetLimit} sheets.`,
    );
  }

  const sourceBlocks = [];
  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      blankrows: false,
      raw: false,
      defval: "",
    });
    if (rows.length === 0) {
      continue;
    }

    const headers = rows[0].map((header, index) => String(header || `Column ${index + 1}`).trim());
    const dataRows = rows.slice(1, rowLimit + 1);
    if (rows.length - 1 > rowLimit) {
      appendWarning(
        warnings,
        "XLSX_ROWS_TRUNCATED",
        `Sheet ${sheetName} was limited to ${rowLimit} rows.`,
        { sheetName },
      );
    }

    sourceBlocks.push(
      makeSourceBlock({
        blockIndex: sourceBlocks.length,
        blockType: "sheet_header",
        text: `Sheet ${sheetName} headers: ${headers.join("; ")}.`,
        locator: { sheetName, rowStart: 1, rowEnd: 1 },
      }),
    );

    for (const [index, row] of dataRows.entries()) {
      const rowNumber = index + 2;
      sourceBlocks.push(
        makeSourceBlock({
          blockIndex: sourceBlocks.length,
          blockType: "sheet_row",
          text: compactSheetRow(headers, row, rowNumber),
          locator: { sheetName, rowStart: rowNumber, rowEnd: rowNumber },
        }),
      );
    }
  }

  const extractedText = sourceBlocks.map((block) => block.text).join("\n");

  return buildExtractionResult({
    title: titleFromFilename(originalFilename),
    fileKind: EXTRACTION_FILE_KIND.XLSX,
    originalFilename,
    extractedText,
    sourceBlocks,
    warnings,
  });
}
