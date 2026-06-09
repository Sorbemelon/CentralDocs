import { readFile } from "node:fs/promises";
import path from "node:path";
import { EXTRACTION_FILE_KIND } from "../../constants/extraction.constants.js";
import { buildExtractionResult, makeSourceBlock } from "./extractionResult.dto.js";
import { normalizeLineEndings } from "./normalizeText.service.js";

function titleFromFilename(filename = "") {
  return path.basename(filename, path.extname(filename)) || "Text document";
}

function makeParagraphBlocks(text) {
  return normalizeLineEndings(text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) =>
      makeSourceBlock({
        blockIndex: index,
        blockType: "paragraph",
        text: paragraph,
        locator: {},
      }),
    );
}

export async function extractTextFile({ filePath, originalFilename = path.basename(filePath), fileKind = EXTRACTION_FILE_KIND.TEXT } = {}) {
  const raw = await readFile(filePath, "utf8");
  const extractedText = normalizeLineEndings(raw).replace(/\u0000/g, "");

  return buildExtractionResult({
    title: titleFromFilename(originalFilename),
    fileKind,
    originalFilename,
    extractedText,
    sourceBlocks: makeParagraphBlocks(extractedText),
  });
}
