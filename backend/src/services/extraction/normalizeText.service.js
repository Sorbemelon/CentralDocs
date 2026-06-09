import { EXTRACTION_LIMITS } from "../../constants/extraction.constants.js";
import { appendWarning, truncateText } from "./extractionLimit.service.js";

const TOKEN_CHAR_RATIO = 4;

function normalizeWhitespaceLine(line) {
  return String(line || "")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function isLikelyStylingOnly(line) {
  const text = line.trim();
  if (!text) {
    return false;
  }

  return /^[\-_=\*#\s]{4,}$/.test(text);
}

function stripRepeatedPageAffixes(lines) {
  const nonEmpty = lines.filter(Boolean);
  if (nonEmpty.length < 8) {
    return lines;
  }

  const counts = nonEmpty.reduce((map, line) => {
    if (line.length <= 80) {
      map.set(line, (map.get(line) || 0) + 1);
    }
    return map;
  }, new Map());
  const repeated = new Set(
    [...counts.entries()]
      .filter(([line, count]) => count >= 3 && !line.startsWith("#") && !line.startsWith("-"))
      .map(([line]) => line),
  );

  if (repeated.size === 0) {
    return lines;
  }

  return lines.filter((line) => !repeated.has(line));
}

export function normalizeLineEndings(text = "") {
  return String(text || "").replace(/\r\n?/g, "\n");
}

export function estimateTokensFromText(text = "") {
  return Math.ceil(String(text || "").length / TOKEN_CHAR_RATIO);
}

export function normalizeExtractedText(text = "", { maxChars = EXTRACTION_LIMITS.maxOptimizedTextChars, warnings = [] } = {}) {
  const rawLines = normalizeLineEndings(text)
    .split("\n")
    .map(normalizeWhitespaceLine)
    .filter((line) => !isLikelyStylingOnly(line));

  const deduped = [];
  let previous = null;
  let blankPending = false;

  for (const line of stripRepeatedPageAffixes(rawLines)) {
    if (!line) {
      if (!blankPending && deduped.length > 0) {
        deduped.push("");
        blankPending = true;
      }
      previous = line;
      continue;
    }

    blankPending = false;
    if (line === previous) {
      continue;
    }

    deduped.push(line);
    previous = line;
  }

  const normalized = deduped.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  const limited = truncateText(normalized, maxChars);
  if (limited.truncated) {
    appendWarning(
      warnings,
      "OPTIMIZED_TEXT_TRUNCATED",
      `Optimized text was limited to ${maxChars} characters.`,
    );
  }

  return {
    text: limited.text,
    truncated: limited.truncated,
    estimatedTokenCount: estimateTokensFromText(limited.text),
  };
}

export function compressLongText(value = "", maxChars = 300) {
  const normalized = normalizeWhitespaceLine(value);
  if (normalized.length <= maxChars) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxChars - 1)).trimEnd()}...`;
}
