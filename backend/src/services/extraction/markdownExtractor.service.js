import { readFile } from "node:fs/promises";
import path from "node:path";
import { EXTRACTION_FILE_KIND } from "../../constants/extraction.constants.js";
import { buildExtractionResult, makeSourceBlock } from "./extractionResult.dto.js";
import { normalizeLineEndings } from "./normalizeText.service.js";

function titleFromFilename(filename = "") {
  return path.basename(filename, path.extname(filename)) || "Markdown document";
}

function buildMarkdownBlocks(text) {
  const blocks = [];
  let sectionTitle = null;
  let buffer = [];

  function flush() {
    const blockText = buffer.join("\n").trim();
    if (!blockText) {
      buffer = [];
      return;
    }

    blocks.push(
      makeSourceBlock({
        blockIndex: blocks.length,
        blockType: sectionTitle ? "section" : "paragraph",
        text: blockText,
        locator: sectionTitle ? { sectionTitle } : {},
      }),
    );
    buffer = [];
  }

  for (const line of normalizeLineEndings(text).split("\n")) {
    const trimmed = line.trim();
    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flush();
      sectionTitle = heading[2].trim();
      buffer.push(sectionTitle);
      continue;
    }

    if (!trimmed) {
      flush();
      continue;
    }

    buffer.push(trimmed);
  }

  flush();
  return blocks;
}

export async function extractMarkdownFile({ filePath, originalFilename = path.basename(filePath) } = {}) {
  const extractedText = normalizeLineEndings(await readFile(filePath, "utf8")).replace(/\u0000/g, "");

  return buildExtractionResult({
    title: titleFromFilename(originalFilename),
    fileKind: EXTRACTION_FILE_KIND.MARKDOWN,
    originalFilename,
    extractedText,
    sourceBlocks: buildMarkdownBlocks(extractedText),
  });
}
