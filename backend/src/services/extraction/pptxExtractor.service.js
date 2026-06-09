import path from "node:path";
import yauzl from "yauzl";
import { EXTRACTION_FILE_KIND, EXTRACTION_LIMITS } from "../../constants/extraction.constants.js";
import { buildExtractionResult, makeSourceBlock } from "./extractionResult.dto.js";
import { appendWarning, getSlideLimit } from "./extractionLimit.service.js";

function titleFromFilename(filename = "") {
  return path.basename(filename, path.extname(filename)) || "Presentation document";
}

function decodeXmlText(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSlideText(xml = "") {
  const textRuns = [...String(xml).matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)]
    .map((match) => decodeXmlText(match[1]))
    .filter(Boolean);

  return textRuns.join("\n");
}

function readEntry(zipFile, entry) {
  return new Promise((resolve, reject) => {
    zipFile.openReadStream(entry, (streamError, readStream) => {
      if (streamError) {
        reject(streamError);
        return;
      }

      const buffers = [];
      readStream.on("data", (buffer) => buffers.push(buffer));
      readStream.on("error", reject);
      readStream.on("end", () => resolve(Buffer.concat(buffers).toString("utf8")));
    });
  });
}

function openZip(filePath) {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, (error, zipFile) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(zipFile);
    });
  });
}

async function readPptxSlides(filePath, maxSlides, warnings) {
  const zipFile = await openZip(filePath);
  const slides = [];

  return new Promise((resolve, reject) => {
    zipFile.on("entry", async (entry) => {
      try {
        const match = entry.fileName.match(/^ppt\/slides\/slide(\d+)\.xml$/);
        if (!match) {
          zipFile.readEntry();
          return;
        }

        const slideNumber = Number(match[1]);
        if (slides.length >= maxSlides) {
          appendWarning(
            warnings,
            "PPTX_SLIDES_TRUNCATED",
            `Presentation extraction was limited to ${maxSlides} slides.`,
          );
          zipFile.close();
          resolve(slides);
          return;
        }

        const xml = await readEntry(zipFile, entry);
        slides.push({
          slideNumber,
          text: extractSlideText(xml),
        });
        zipFile.readEntry();
      } catch (error) {
        zipFile.close();
        reject(error);
      }
    });

    zipFile.on("end", () => resolve(slides));
    zipFile.on("error", reject);
    zipFile.readEntry();
  });
}

export async function extractPptxFile({
  filePath,
  originalFilename = path.basename(filePath),
  maxSlides = EXTRACTION_LIMITS.maxPptxSlides,
} = {}) {
  const warnings = [];
  const slideLimit = getSlideLimit(maxSlides);
  const slides = await readPptxSlides(filePath, slideLimit, warnings);
  if (slides.length === 0) {
    appendWarning(
      warnings,
      "PPTX_EXTRACTION_PARTIAL",
      "No slide text was found in the PPTX package.",
    );
  }

  const sourceBlocks = slides
    .sort((left, right) => left.slideNumber - right.slideNumber)
    .map((slide, index) =>
      makeSourceBlock({
        blockIndex: index,
        blockType: "slide",
        text: slide.text || `Slide ${slide.slideNumber}: no extractable text.`,
        locator: { slideNumber: slide.slideNumber },
        metadata: { extractionMode: "pptx_zip_xml_text" },
      }),
    );
  const extractedText = sourceBlocks.map((block) => `Slide ${block.locator.slideNumber}: ${block.text}`).join("\n");

  return buildExtractionResult({
    title: titleFromFilename(originalFilename),
    fileKind: EXTRACTION_FILE_KIND.PPTX,
    originalFilename,
    extractedText,
    sourceBlocks,
    warnings,
  });
}
