import { CHUNKING_STRATEGY } from "../../constants/chunking.constants.js";
import {
  applyChunkCountLimit,
  createChunkWarning,
  getChunkLimits,
} from "./chunkLimit.service.js";
import { createChunkDraft, reindexChunkDrafts } from "./chunkDraft.dto.js";
import {
  clampTextToTokenBudget,
  estimateCharsFromTokens,
  estimateTokensFromText,
} from "./tokenEstimate.service.js";

function splitParagraphs(text = "") {
  return String(text || "")
    .split(/\n{2,}|\r?\n(?=#{1,6}\s)|\r?\n(?=-\s)/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitLongText(text, maxTokens) {
  const maxChars = estimateCharsFromTokens(maxTokens);
  if (!maxChars || text.length <= maxChars) {
    return [text];
  }

  const parts = [];
  let cursor = 0;
  while (cursor < text.length) {
    const windowEnd = Math.min(text.length, cursor + maxChars);
    const slice = text.slice(cursor, windowEnd);
    const splitAt = slice.lastIndexOf(" ");
    const end = splitAt > maxChars * 0.6 ? cursor + splitAt : windowEnd;
    parts.push(text.slice(cursor, end).trim());
    cursor = end;
  }

  return parts.filter(Boolean);
}

function getOverlapText(text, overlapTokens) {
  if (!overlapTokens) {
    return "";
  }

  const overlapChars = estimateCharsFromTokens(overlapTokens);
  if (!overlapChars || text.length <= overlapChars) {
    return text;
  }

  return text.slice(-overlapChars).trim();
}

function buildChunkContent(parts, overlapText) {
  return [overlapText, ...parts].filter(Boolean).join("\n\n").trim();
}

export function createChunkDraftsFromText(text = "", options = {}) {
  const limits = getChunkLimits(options);
  const warnings = [...(options.warnings || [])];
  const paragraphs = splitParagraphs(text)
    .flatMap((paragraph) => splitLongText(paragraph, limits.maxTokens))
    .filter(Boolean);
  const chunks = [];
  let currentParts = [];
  let previousContent = "";

  for (const paragraph of paragraphs) {
    const prospective = buildChunkContent(currentParts.concat(paragraph), "");
    if (
      currentParts.length > 0 &&
      estimateTokensFromText(prospective) > limits.maxTokens
    ) {
      const overlapText = getOverlapText(previousContent, limits.overlapTokens);
      const content = buildChunkContent(currentParts, overlapText);
      const clamped = clampTextToTokenBudget(content, limits.maxTokens);
      chunks.push(
        createChunkDraft({
          ...options,
          chunkIndex: chunks.length,
          content: clamped.text,
          sourceLocator: {},
          sourceBlockRefs: [],
          chunkMeta: {
            strategy: CHUNKING_STRATEGY.RAW_TEXT,
            overlapTokens: chunks.length === 0 ? 0 : limits.overlapTokens,
            truncated: clamped.truncated,
            warnings: clamped.truncated
              ? [createChunkWarning("CHUNK_TEXT_TRUNCATED", "Chunk text was clamped to token budget.")]
              : [],
          },
        }),
      );
      previousContent = currentParts.join("\n\n");
      currentParts = [paragraph];
    } else {
      currentParts.push(paragraph);
    }
  }

  if (currentParts.length > 0) {
    const overlapText = getOverlapText(previousContent, limits.overlapTokens);
    const content = buildChunkContent(currentParts, overlapText);
    const clamped = clampTextToTokenBudget(content, limits.maxTokens);
    chunks.push(
      createChunkDraft({
        ...options,
        chunkIndex: chunks.length,
        content: clamped.text,
        sourceLocator: {},
        sourceBlockRefs: [],
        chunkMeta: {
          strategy: CHUNKING_STRATEGY.RAW_TEXT,
          overlapTokens: chunks.length === 0 ? 0 : limits.overlapTokens,
          truncated: clamped.truncated,
          warnings: clamped.truncated
            ? [createChunkWarning("CHUNK_TEXT_TRUNCATED", "Chunk text was clamped to token budget.")]
            : [],
        },
      }),
    );
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
