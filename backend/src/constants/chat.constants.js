export const CHAT_ROLE = Object.freeze({
  USER: "user",
  ASSISTANT: "assistant",
});

export const CHAT_ROLES = Object.freeze(Object.values(CHAT_ROLE));

export const CHAT_MESSAGE_STATUS = Object.freeze({
  PENDING: "pending",
  COMPLETE: "complete",
  FAILED: "failed",
});

export const CHAT_MESSAGE_STATUSES = Object.freeze(Object.values(CHAT_MESSAGE_STATUS));

export const REFERENCE_USED_FIELDS = Object.freeze([
  "citationNumber",
  "documentId",
  "documentTitle",
  "fileType",
  "folderName",
  "chunkId",
  "sectionTitle",
  "pageNumber",
  "slideNumber",
  "sheetName",
  "rowRange",
  "mediaTimestamp",
  "excerptPreview",
  "similarityScore",
  "usedFor",
]);
