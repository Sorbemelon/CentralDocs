import { SOURCE_LOCATOR_FIELDS } from "../../constants/chunking.constants.js";
import { capContentPreview } from "./chunkLimit.service.js";
import { estimateTokensFromText } from "./tokenEstimate.service.js";

function sanitizeLocator(locator = {}) {
  return SOURCE_LOCATOR_FIELDS.reduce((safe, field) => {
    if (locator[field] !== undefined && locator[field] !== null) {
      safe[field] = locator[field];
    }
    return safe;
  }, {});
}

function sanitizeBlockRefs(blockRefs = []) {
  return blockRefs
    .filter((ref) => Number.isInteger(ref.blockIndex))
    .map((ref) => ({
      blockIndex: ref.blockIndex,
      ...(ref.blockType ? { blockType: ref.blockType } : {}),
    }));
}

export function createChunkDraft({
  documentId = null,
  sourceDocumentTitle = null,
  fileKind = null,
  scope = null,
  chunkIndex = 0,
  content = "",
  sourceLocator = {},
  sourceBlockRefs = [],
  chunkMeta = {},
} = {}) {
  const safeContent = String(content || "").trim();

  return {
    documentId,
    sourceDocumentTitle,
    fileKind,
    scope,
    chunkIndex,
    content: safeContent,
    contentPreview: capContentPreview(safeContent),
    tokenEstimate: estimateTokensFromText(safeContent),
    sourceLocator: sanitizeLocator(sourceLocator),
    sourceBlockRefs: sanitizeBlockRefs(sourceBlockRefs),
    chunkMeta: {
      strategy: chunkMeta.strategy || "unknown",
      overlapTokens: chunkMeta.overlapTokens || 0,
      truncated: Boolean(chunkMeta.truncated),
      warnings: chunkMeta.warnings || [],
      createdFromExtraction: true,
    },
  };
}

export function reindexChunkDrafts(chunks = []) {
  return chunks.map((chunk, index) => ({
    ...chunk,
    chunkIndex: index,
  }));
}
