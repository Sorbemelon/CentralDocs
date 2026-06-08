const MB = 1024 * 1024;
const KB = 1024;

export const DEMO_LIMITS = Object.freeze({
  sessionLifetimeDays: 3,
  maxUploadedFiles: 5,
  maxChatSessions: 5,
  maxAiPrompts: 10,
  maxGeneratedDocuments: 3,
  maxUserFolders: 10,
  maxStorageBytes: 20 * MB,
  maxGeneratedDocumentBytes: 100 * KB,
  maxPromptLengthChars: 1500,
  maxGenerateDocumentInstructionLengthChars: 2000,
  maxSemanticSearchQueryLengthChars: 500,
  topKRetrieval: 6,
  visibleReferences: 5,
  recentChatHistoryMessages: 8,
});

export const EMPTY_DEMO_USAGE = Object.freeze({
  uploadedFiles: 0,
  chatSessions: 0,
  aiPrompts: 0,
  generatedDocuments: 0,
  userFolders: 0,
  storageBytes: 0,
});
