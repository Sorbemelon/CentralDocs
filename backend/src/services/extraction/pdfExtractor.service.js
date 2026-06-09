import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import { EXTRACTION_FILE_KIND, EXTRACTION_LIMITS } from "../../constants/extraction.constants.js";
import { buildExtractionResult, makeSourceBlock } from "./extractionResult.dto.js";
import { appendWarning } from "./extractionLimit.service.js";

function titleFromFilename(filename = "") {
  return path.basename(filename, path.extname(filename)) || "PDF document";
}

export async function extractPdfFile({ filePath, originalFilename = path.basename(filePath), maxPages = EXTRACTION_LIMITS.maxPublicPdfPages } = {}) {
  const warnings = [];
  const buffer = await readFile(filePath);
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText({ first: maxPages });
    if (result.total > maxPages) {
      appendWarning(
        warnings,
        "PDF_PAGES_TRUNCATED",
        `PDF extraction was limited to ${maxPages} pages.`,
        { totalPages: result.total },
      );
    }

    const pages = result.pages || [];
    const sourceBlocks = pages.map((page, index) =>
      makeSourceBlock({
        blockIndex: index,
        blockType: "page",
        text: page.text || "",
        locator: { pageNumber: page.num || index + 1 },
        metadata: { totalPages: result.total },
      }),
    );

    return buildExtractionResult({
      title: titleFromFilename(originalFilename),
      fileKind: EXTRACTION_FILE_KIND.PDF,
      originalFilename,
      extractedText: result.text || sourceBlocks.map((block) => block.text).join("\n"),
      sourceBlocks,
      warnings,
      truncated: result.total > maxPages,
    });
  } finally {
    await parser.destroy();
  }
}
