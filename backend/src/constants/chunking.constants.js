export const CHUNKING_LIMITS = Object.freeze({
  targetMinTokens: 700,
  targetMaxTokens: 900,
  minUsefulTokens: 80,
  overlapTokens: 80,
  maxUploadedChunks: 10,
  maxGeneratedChunks: 8,
  maxMockChunks: 16,
  maxContentPreviewChars: 500,
});

export const CHUNK_SOURCE_KIND = Object.freeze({
  USER: "user",
  GENERATED: "generated",
  MOCK: "mock",
});

export const CHUNKING_STRATEGY = Object.freeze({
  SOURCE_BLOCKS: "source_blocks",
  RAW_TEXT: "raw_text",
});

export const CHUNKING_ERROR_CODE = Object.freeze({
  CHUNKING_FAILED: "CHUNKING_FAILED",
  INVALID_EXTRACTION_RESULT: "INVALID_EXTRACTION_RESULT",
  EMPTY_EXTRACTION_TEXT: "EMPTY_EXTRACTION_TEXT",
  UNSUPPORTED_CHUNK_SOURCE: "UNSUPPORTED_CHUNK_SOURCE",
  CHUNK_LIMIT_EXCEEDED: "CHUNK_LIMIT_EXCEEDED",
});

export const SOURCE_LOCATOR_FIELDS = Object.freeze([
  "pageNumber",
  "slideNumber",
  "sheetName",
  "rowStart",
  "rowEnd",
  "sectionTitle",
  "mediaTimestampStart",
  "mediaTimestampEnd",
]);
