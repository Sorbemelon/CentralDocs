import {
  CHUNKING_STRATEGY,
  SOURCE_LOCATOR_FIELDS,
} from "../../constants/chunking.constants.js";
import {
  applyChunkCountLimit,
  createChunkWarning,
  getChunkLimits,
} from "./chunkLimit.service.js";
import { createChunkDraft, reindexChunkDrafts } from "./chunkDraft.dto.js";
import {
  clampTextToTokenBudget,
  estimateTokensFromText,
} from "./tokenEstimate.service.js";

function cleanBlocks(sourceBlocks = []) {
  return sourceBlocks
    .filter((block) => String(block?.text || "").trim())
    .map((block, index) => ({
      blockIndex: Number.isInteger(block.blockIndex) ? block.blockIndex : index,
      blockType: block.blockType || "text",
      text: String(block.text || "").trim(),
      locator: block.locator || {},
    }));
}

function splitLongBlock(block, maxTokens) {
  if (estimateTokensFromText(block.text) <= maxTokens) {
    return [block];
  }

  const words = block.text.split(/\s+/).filter(Boolean);
  const parts = [];
  let current = [];
  for (const word of words) {
    const prospective = current.concat(word).join(" ");
    if (current.length > 0 && estimateTokensFromText(prospective) > maxTokens) {
      parts.push({
        ...block,
        text: current.join(" "),
      });
      current = [word];
    } else {
      current.push(word);
    }
  }
  if (current.length > 0) {
    parts.push({
      ...block,
      text: current.join(" "),
    });
  }

  return parts;
}

function sameValue(values) {
  const unique = [...new Set(values.filter((value) => value !== undefined && value !== null))];
  return unique.length === 1 ? unique[0] : null;
}

function mergeLocators(blocks, warnings) {
  const locator = {};
  const pageNumbers = blocks.map((block) => block.locator.pageNumber);
  const slideNumbers = blocks.map((block) => block.locator.slideNumber);
  const sheetNames = blocks.map((block) => block.locator.sheetName);
  const sectionTitles = blocks.map((block) => block.locator.sectionTitle);
  const rowValues = blocks.flatMap((block) => [block.locator.rowStart, block.locator.rowEnd])
    .filter((value) => value !== undefined && value !== null);
  const mediaStarts = blocks
    .map((block) => block.locator.mediaTimestampStart)
    .filter((value) => value !== undefined && value !== null);
  const mediaEnds = blocks
    .map((block) => block.locator.mediaTimestampEnd ?? block.locator.mediaTimestampStart)
    .filter((value) => value !== undefined && value !== null);

  const pageNumber = sameValue(pageNumbers);
  if (pageNumber !== null) {
    locator.pageNumber = pageNumber;
  } else if (pageNumbers.some(Boolean)) {
    locator.pageNumber = pageNumbers.find(Boolean);
    warnings.push(createChunkWarning("MIXED_PAGE_LOCATORS", "Merged chunk spans multiple pages."));
  }

  const slideNumber = sameValue(slideNumbers);
  if (slideNumber !== null) {
    locator.slideNumber = slideNumber;
  } else if (slideNumbers.some(Boolean)) {
    locator.slideNumber = slideNumbers.find(Boolean);
    warnings.push(createChunkWarning("MIXED_SLIDE_LOCATORS", "Merged chunk spans multiple slides."));
  }

  const sheetName = sameValue(sheetNames);
  if (sheetName !== null) {
    locator.sheetName = sheetName;
    if (rowValues.length > 0) {
      locator.rowStart = Math.min(...rowValues);
      locator.rowEnd = Math.max(...rowValues);
    }
  } else if (sheetNames.some(Boolean)) {
    locator.sheetName = sheetNames.find(Boolean);
    warnings.push(createChunkWarning("MIXED_SHEET_LOCATORS", "Merged chunk spans multiple sheets."));
  }
  if (!locator.sheetName && rowValues.length > 0) {
    locator.rowStart = Math.min(...rowValues);
    locator.rowEnd = Math.max(...rowValues);
  }

  const sectionTitle = sameValue(sectionTitles);
  if (sectionTitle !== null) {
    locator.sectionTitle = sectionTitle;
  } else if (sectionTitles.some(Boolean)) {
    locator.sectionTitle = sectionTitles.find(Boolean);
  }

  if (mediaStarts.length > 0) {
    locator.mediaTimestampStart = mediaStarts[0];
    locator.mediaTimestampEnd = mediaEnds[mediaEnds.length - 1] ?? mediaStarts[0];
  }

  return SOURCE_LOCATOR_FIELDS.reduce((safe, field) => {
    if (locator[field] !== undefined && locator[field] !== null) {
      safe[field] = locator[field];
    }
    return safe;
  }, {});
}

function refsFromBlocks(blocks) {
  return blocks.map((block) => ({
    blockIndex: block.blockIndex,
    blockType: block.blockType,
  }));
}

function makeDraftFromBlocks(blocks, options, limits, chunksLength) {
  const chunkWarnings = [];
  const content = blocks.map((block) => block.text).join("\n\n").trim();
  const clamped = clampTextToTokenBudget(content, limits.maxTokens);
  if (clamped.truncated) {
    chunkWarnings.push(
      createChunkWarning("CHUNK_TEXT_TRUNCATED", "Chunk text was clamped to token budget."),
    );
  }

  return createChunkDraft({
    ...options,
    chunkIndex: chunksLength,
    content: clamped.text,
    sourceLocator: mergeLocators(blocks, chunkWarnings),
    sourceBlockRefs: refsFromBlocks(blocks),
    chunkMeta: {
      strategy: CHUNKING_STRATEGY.SOURCE_BLOCKS,
      overlapTokens: 0,
      truncated: clamped.truncated,
      warnings: chunkWarnings,
    },
  });
}

export function createChunkDraftsFromSourceBlocks(sourceBlocks = [], options = {}) {
  const limits = getChunkLimits(options);
  const warnings = [...(options.warnings || [])];
  const blocks = cleanBlocks(sourceBlocks)
    .flatMap((block) => splitLongBlock(block, limits.maxTokens))
    .filter(Boolean);
  const chunks = [];
  let current = [];

  for (const block of blocks) {
    const candidate = current.concat(block);
    const candidateText = candidate.map((item) => item.text).join("\n\n");
    if (current.length > 0 && estimateTokensFromText(candidateText) > limits.maxTokens) {
      chunks.push(makeDraftFromBlocks(current, options, limits, chunks.length));
      current = [block];
    } else {
      current = candidate;
    }
  }

  if (current.length > 0) {
    chunks.push(makeDraftFromBlocks(current, options, limits, chunks.length));
  }

  const limited = applyChunkCountLimit(chunks, {
    maxChunks: limits.maxChunks,
    warnings,
  });

  return {
    chunks: reindexChunkDrafts(limited.chunks),
    warnings: limited.warnings,
    truncated: limited.truncated || chunks.some((chunk) => chunk.chunkMeta.truncated),
  };
}
