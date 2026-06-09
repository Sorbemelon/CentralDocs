import path from "node:path";
import mammoth from "mammoth";
import { EXTRACTION_FILE_KIND } from "../../constants/extraction.constants.js";
import { buildExtractionResult, makeSourceBlock } from "./extractionResult.dto.js";
import { appendWarning } from "./extractionLimit.service.js";
import { normalizeLineEndings } from "./normalizeText.service.js";

function titleFromFilename(filename = "") {
  return path.basename(filename, path.extname(filename)) || "DOCX document";
}

function buildDocxBlocks(text) {
  return normalizeLineEndings(text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) =>
      makeSourceBlock({
        blockIndex: index,
        blockType: paragraph.length <= 120 && !paragraph.endsWith(".") ? "section" : "paragraph",
        text: paragraph,
        locator:
          paragraph.length <= 120 && !paragraph.endsWith(".")
            ? { sectionTitle: paragraph }
            : {},
      }),
    );
}

export async function extractDocxFile({ filePath, originalFilename = path.basename(filePath) } = {}) {
  const warnings = [];
  const result = await mammoth.extractRawText({ path: filePath });
  for (const message of result.messages || []) {
    appendWarning(warnings, "DOCX_EXTRACTION_MESSAGE", message.message || "DOCX extraction warning.");
  }

  const extractedText = normalizeLineEndings(result.value || "");

  return buildExtractionResult({
    title: titleFromFilename(originalFilename),
    fileKind: EXTRACTION_FILE_KIND.DOCX,
    originalFilename,
    extractedText,
    sourceBlocks: buildDocxBlocks(extractedText),
    warnings,
  });
}
