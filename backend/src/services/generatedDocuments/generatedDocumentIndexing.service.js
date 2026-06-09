import {
  GENERATED_DOCUMENT_ERROR_CODE,
} from "../../constants/generatedDocument.constants.js";
import { buildExtractionResult, makeSourceBlock } from "../extraction/extractionResult.dto.js";
import { indexDocumentFromExtraction } from "../indexing/documentIndexing.service.js";

export function buildGeneratedDocumentExtractionResult({
  document = {},
  content = "",
} = {}) {
  const text = String(content || "");

  return buildExtractionResult({
    title: document.title || "Generated document",
    fileKind: document.fileKind || "markdown",
    originalFilename: document.originalFilename || document.downloadFilename,
    extractedText: text,
    optimizedText: text,
    sourceBlocks: [
      makeSourceBlock({
        blockIndex: 0,
        blockType: "generated_document",
        text,
        locator: {
          sectionTitle: document.title || "Generated document",
        },
        metadata: {
          createdFromGeneratedDocument: true,
        },
      }),
    ],
  });
}

export async function indexGeneratedDocument({
  document,
  content,
  indexer = indexDocumentFromExtraction,
  embedder,
  repositories,
  options = {},
} = {}) {
  const extractionResult = buildGeneratedDocumentExtractionResult({ document, content });

  try {
    const result = await indexer({
      document,
      extractionResult,
      embedder,
      repositories,
      options,
    });

    return {
      indexed: true,
      extractionResult,
      result,
      contentStats: result?.contentStats || result?.document?.contentStats || null,
      warnings: result?.warnings || [],
    };
  } catch (error) {
    return {
      indexed: false,
      extractionResult,
      result: null,
      contentStats: null,
      warnings: [
        {
          code: GENERATED_DOCUMENT_ERROR_CODE.INDEXING_FAILED,
          message: "Generated document was saved, but indexing did not complete.",
          reason: error?.code || "INDEXING_FAILED",
        },
      ],
    };
  }
}
