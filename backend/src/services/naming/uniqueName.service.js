import path from "node:path";

export function normalizeComparableName(name) {
  return String(name || "").trim().toLowerCase();
}

function normalizeExisting(existingNames = []) {
  return new Set(existingNames.map(normalizeComparableName).filter(Boolean));
}

function trimStemForSuffix(stem, suffix, maxLength, extension = "") {
  const limit = Math.max(1, maxLength - suffix.length - extension.length);
  return stem.length <= limit ? stem : stem.slice(0, limit).trimEnd();
}

export function buildUniqueName(baseName, existingNames = [], { maxLength = 120 } = {}) {
  const base = String(baseName || "").trim();
  const existing = normalizeExisting(existingNames);
  if (!existing.has(normalizeComparableName(base))) return base;

  for (let index = 2; index < 10000; index += 1) {
    const suffix = ` (${index})`;
    const candidate = `${trimStemForSuffix(base, suffix, maxLength)}${suffix}`;
    if (!existing.has(normalizeComparableName(candidate))) return candidate;
  }

  return `${trimStemForSuffix(base, " (unique)", maxLength)} (unique)`;
}

export function buildUniqueFilename(filename, existingNames = [], { maxLength = 120 } = {}) {
  const value = String(filename || "").trim();
  const extension = path.extname(value);
  const basename = path.basename(value, extension) || value;
  const existing = normalizeExisting(existingNames);
  const conflicts = (candidate) => {
    const candidateExtension = path.extname(candidate);
    const candidateBasename = path.basename(candidate, candidateExtension) || candidate;
    return (
      existing.has(normalizeComparableName(candidate)) ||
      existing.has(normalizeComparableName(candidateBasename))
    );
  };
  if (!conflicts(value)) return value;

  for (let index = 2; index < 10000; index += 1) {
    const suffix = ` (${index})`;
    const candidate = `${trimStemForSuffix(basename, suffix, maxLength, extension)}${suffix}${extension}`;
    if (!conflicts(candidate)) return candidate;
  }

  return `${trimStemForSuffix(basename, " (unique)", maxLength, extension)} (unique)${extension}`;
}
