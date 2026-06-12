import { AI_ACTION_TYPE } from "../../constants/ai.constants.js";
import { DEMO_LIMITS, EMPTY_DEMO_USAGE } from "../../config/limits.js";
import {
  GENERATED_DOCUMENT_DEFAULT_INSTRUCTION,
  GENERATED_DOCUMENT_ERROR_CODE,
} from "../../constants/generatedDocument.constants.js";
import { createHttpError, HttpError } from "../../utils/httpError.js";
import { generateTextWithLane } from "../ai/geminiGeneration.service.js";
import * as defaultChatMessageRepository from "../chats/chatMessage.repository.js";
import * as defaultChatSessionRepository from "../chats/chatSession.repository.js";
import { requireDemoSessionId } from "../chats/chatSession.service.js";
import {
  applyUsageDelta,
  getRemainingLimits,
  getUsageSnapshot,
} from "../demo/demoUsage.service.js";
import {
  applyDemoSessionUsageDelta,
  getDemoSession,
} from "../demo/demoSession.service.js";
import { resolveChatSelection } from "../chats/chatSelection.service.js";
import { buildGeneratedDocumentPrompt } from "./generatedDocumentPrompt.service.js";
import { collectGeneratedDocumentReferences } from "./generatedDocumentReference.service.js";
import {
  buildGeneratedDocumentPayload,
  createGeneratedDocumentId,
  createGeneratedDocumentRecord,
  countGeneratedDocumentsByDemoSession,
  listGeneratedDocumentFilenamesByDemoSession,
  updateGeneratedDocumentIndexingFields,
} from "./generatedDocument.repository.js";
import { normalizeGeneratedDocumentFilename } from "./generatedDocumentFilename.service.js";
import { indexGeneratedDocument } from "./generatedDocumentIndexing.service.js";
import { saveGeneratedDocumentObject } from "./generatedDocumentStorage.service.js";
import { toGeneratedDocumentResponseDto } from "./generatedDocument.dto.js";

const defaultDependencies = Object.freeze({
  chatSessionRepository: defaultChatSessionRepository,
  chatMessageRepository: defaultChatMessageRepository,
  selectionResolver: resolveChatSelection,
  filenameNormalizer: normalizeGeneratedDocumentFilename,
  referenceCollector: collectGeneratedDocumentReferences,
  promptBuilder: buildGeneratedDocumentPrompt,
  generator: generateTextWithLane,
  storageSaver: saveGeneratedDocumentObject,
  indexer: indexGeneratedDocument,
  demoSessionReader: getDemoSession,
  demoSessionUsageUpdater: applyDemoSessionUsageDelta,
  generatedDocumentRepository: {
    createDocumentId: createGeneratedDocumentId,
    createGeneratedDocumentRecord,
    countGeneratedDocumentsByDemoSession,
    listGeneratedDocumentFilenamesByDemoSession,
    updateGeneratedDocumentIndexingFields,
  },
  payloadBuilder: buildGeneratedDocumentPayload,
});

let generatedDocumentTestDependencies = {};

function getDependencies(overrides = {}) {
  return {
    ...defaultDependencies,
    ...generatedDocumentTestDependencies,
    ...overrides,
  };
}

export function setGeneratedDocumentDependenciesForTests(overrides = {}) {
  generatedDocumentTestDependencies = overrides;
}

export function resetGeneratedDocumentDependenciesForTests() {
  generatedDocumentTestDependencies = {};
}

function assertChatFound(chat) {
  if (!chat) {
    throw createHttpError(
      404,
      "Chat session was not found.",
      GENERATED_DOCUMENT_ERROR_CODE.CHAT_NOT_FOUND,
    );
  }

  return chat;
}

function validateInstruction(instruction) {
  const trimmed = String(instruction || "").trim();
  if (trimmed.length > DEMO_LIMITS.maxGenerateDocumentInstructionLengthChars) {
    throw createHttpError(
      400,
      `Generated document instruction must be ${DEMO_LIMITS.maxGenerateDocumentInstructionLengthChars} characters or fewer.`,
      GENERATED_DOCUMENT_ERROR_CODE.INSTRUCTION_TOO_LONG,
    );
  }

  return trimmed || GENERATED_DOCUMENT_DEFAULT_INSTRUCTION;
}

function getChatId(chat = {}) {
  return String(chat._id || chat.id || "");
}

function getMessageId(message = {}) {
  return String(message._id || message.id || "");
}

function assertChatHasMessages(messages = []) {
  if (messages.length === 0) {
    throw createHttpError(
      409,
      "Chat session has no messages to turn into a document.",
      GENERATED_DOCUMENT_ERROR_CODE.CHAT_HAS_NO_MESSAGES,
    );
  }
}

function createUsageSession({ session = null, generatedDocumentCount = 0 } = {}) {
  const usage = getUsageSnapshot(session || { usage: EMPTY_DEMO_USAGE });

  return {
    ...(session || {}),
    usage: {
      ...usage,
      generatedDocuments: Math.max(usage.generatedDocuments, generatedDocumentCount),
    },
  };
}

function assertGeneratedDocumentLimit(usageSession) {
  if (
    getUsageSnapshot(usageSession).generatedDocuments >= DEMO_LIMITS.maxGeneratedDocuments
  ) {
    throw createHttpError(
      409,
      "The demo generated document limit has been reached.",
      GENERATED_DOCUMENT_ERROR_CODE.LIMIT_REACHED,
    );
  }
}

function assertGeneratedDocumentSize(usageSession, sizeBytes) {
  if (sizeBytes > DEMO_LIMITS.maxGeneratedDocumentBytes) {
    throw createHttpError(
      409,
      "Generated document content is too large for the demo.",
      GENERATED_DOCUMENT_ERROR_CODE.TOO_LARGE,
    );
  }
  if (getUsageSnapshot(usageSession).storageBytes + sizeBytes > DEMO_LIMITS.maxStorageBytes) {
    throw createHttpError(
      409,
      "The demo storage limit has been reached.",
      GENERATED_DOCUMENT_ERROR_CODE.STORAGE_LIMIT_REACHED,
    );
  }
}

function assertGeneratedText(text) {
  const generatedText = String(text || "").trim();
  if (!generatedText) {
    throw createHttpError(
      502,
      "Generated document output was empty.",
      GENERATED_DOCUMENT_ERROR_CODE.EMPTY_OUTPUT,
    );
  }

  return generatedText;
}

function isHttpError(error) {
  return error instanceof HttpError || (error?.statusCode && error?.code);
}

function normalizeBoolean(value, defaultValue = true) {
  return value === undefined ? defaultValue : Boolean(value);
}

async function getUsageSession({ deps, demoSessionId } = {}) {
  const session = await deps.demoSessionReader(demoSessionId);
  if (!session) {
    throw createHttpError(
      401,
      "An active demo session is required to generate documents.",
      GENERATED_DOCUMENT_ERROR_CODE.SESSION_NOT_FOUND,
    );
  }
  const count = await deps.generatedDocumentRepository.countGeneratedDocumentsByDemoSession({
    demoSessionId,
  });

  return createUsageSession({ session, generatedDocumentCount: count });
}

async function resolveSelectedContext({
  deps,
  demoSessionId,
  chat,
  includeCurrentSelectedDocuments,
} = {}) {
  if (!includeCurrentSelectedDocuments) {
    return {
      selectedDocumentIds: [],
      selectedFolderIds: [],
      resolvedDocuments: [],
      snapshots: {
        attachedDocumentSnapshot: [],
        attachedFolderSnapshot: [],
        resolvedDocumentSnapshot: [],
      },
    };
  }

  return deps.selectionResolver({
    demoSessionId,
    selectedDocumentIds: chat.currentSelectedDocumentIds || [],
    selectedFolderIds: chat.currentSelectedFolderIds || [],
    repositories: deps.selectionRepositories || {},
  });
}

async function maybeUpdateIndexingFields({
  deps,
  document,
  demoSessionId,
  indexing,
} = {}) {
  const documentId = String(document._id || document.id);
  const patch = indexing.indexed && indexing.contentStats
    ? {
        contentStats: indexing.contentStats,
        statusMessage: null,
      }
    : indexing.indexed
      ? {}
      : {
          statusMessage: "Generated document was saved, but indexing did not complete.",
        };

  if (Object.keys(patch).length === 0) {
    return document;
  }

  try {
    return (
      (await deps.generatedDocumentRepository.updateGeneratedDocumentIndexingFields?.({
        documentId,
        demoSessionId,
        patch,
      })) || { ...document, ...patch }
    );
  } catch {
    return { ...document, ...patch };
  }
}

async function updateUsageAfterSave({
  deps,
  demoSessionId,
  usageSession,
  sizeBytes,
} = {}) {
  const delta = { generatedDocuments: 1, storageBytes: sizeBytes };
  const updated =
    (await deps.demoSessionUsageUpdater(demoSessionId, delta)) ||
    applyUsageDelta(usageSession, delta);

  return updated;
}

async function safeUpdateUsageAfterSave(args = {}) {
  try {
    return {
      session: await updateUsageAfterSave(args),
      warning: null,
    };
  } catch {
    return {
      session: args.usageSession,
      warning: "GENERATED_DOCUMENT_USAGE_UPDATE_FAILED",
    };
  }
}

async function safeIndexGeneratedDocument({
  deps,
  document,
  content,
} = {}) {
  try {
    return await deps.indexer({
      document,
      content,
      embedder: deps.embedder,
      repositories: deps.indexingRepositories,
      options: deps.indexingOptions || {},
    });
  } catch (error) {
    return {
      indexed: false,
      contentStats: null,
      warnings: [
        {
          code: GENERATED_DOCUMENT_ERROR_CODE.INDEXING_FAILED,
          reason: error?.code || "INDEXING_FAILED",
        },
      ],
    };
  }
}

function safeGenerationWarnings(generationWarnings = [], indexingWarnings = []) {
  return [...generationWarnings, ...indexingWarnings].map((warning) => {
    if (typeof warning === "string") {
      return warning;
    }
    return warning?.code || warning?.message || "GENERATED_DOCUMENT_WARNING";
  });
}

export async function generateDocumentFromChat({
  chatId,
  demoSessionId,
  body = {},
  dependencies = {},
} = {}) {
  requireDemoSessionId(demoSessionId);
  const deps = getDependencies(dependencies);
  const instruction = validateInstruction(body.instruction);
  const includeReferences = normalizeBoolean(body.includeReferences, true);
  const includeCurrentSelectedDocuments = normalizeBoolean(
    body.includeCurrentSelectedDocuments,
    true,
  );

  const chat = assertChatFound(
    await deps.chatSessionRepository.getChatSessionById({ chatId, demoSessionId }),
  );
  const messages = await deps.chatMessageRepository.listMessagesByChatSession({
    chatSessionId: chatId,
    demoSessionId,
  });
  assertChatHasMessages(messages);

  const usageSession = await getUsageSession({ deps, demoSessionId });
  assertGeneratedDocumentLimit(usageSession);
  const existingFilenames =
    (await deps.generatedDocumentRepository.listGeneratedDocumentFilenamesByDemoSession?.({
      demoSessionId,
    })) || [];
  const filenameMeta = deps.filenameNormalizer(body.filename, { existingFilenames });

  const selection = await resolveSelectedContext({
    deps,
    demoSessionId,
    chat,
    includeCurrentSelectedDocuments,
  });
  const referenceContext = deps.referenceCollector({
    messages,
    includeReferences,
  });
  const prompt = deps.promptBuilder({
    chat,
    instruction,
    messages,
    promptReferences: referenceContext.promptReferences,
    selection,
    filenameMeta,
    includeReferences,
    includeCurrentSelectedDocuments,
  });

  let generation;
  try {
    generation = await deps.generator({
      prompt: prompt.prompt,
      systemInstruction: prompt.systemInstruction,
      clientFactory: deps.clientFactory,
      keySlots: deps.keySlots,
      options: {
        ...(deps.generationOptions || {}),
        actionType: AI_ACTION_TYPE.DOCUMENT_GENERATION,
      },
    });
  } catch (error) {
    if (isHttpError(error)) {
      throw error;
    }
    throw createHttpError(
      502,
      "Generated document content could not be created.",
      GENERATED_DOCUMENT_ERROR_CODE.GENERATION_PROVIDER_ERROR,
    );
  }

  const generatedText = assertGeneratedText(generation.text);
  const sizeBytes = Buffer.byteLength(generatedText, "utf8");
  assertGeneratedDocumentSize(usageSession, sizeBytes);

  const documentId =
    deps.generatedDocumentRepository.createDocumentId?.() || createGeneratedDocumentId();
  const storageResult = await deps.storageSaver({
    demoSessionId,
    documentId,
    filename: filenameMeta.filename,
    content: generatedText,
    contentType: filenameMeta.contentType,
    storage: deps.storage,
  });
  const payload = deps.payloadBuilder({
    documentId,
    demoSessionId,
    chatId: getChatId(chat),
    filenameMeta,
    objectKey: storageResult.objectKey,
    sizeBytes,
    content: generatedText,
    generatedMeta: {
      generationInstruction: instruction,
      sourceMessageIds: referenceContext.sourceMessageIds.length
        ? referenceContext.sourceMessageIds
        : messages.map(getMessageId).filter(Boolean),
      sourceDocumentIds: referenceContext.sourceDocumentIds,
      referencesIncluded: includeReferences,
    },
    expiresAt: usageSession.expiresAt || null,
  });

  let document;
  try {
    document = await deps.generatedDocumentRepository.createGeneratedDocumentRecord(payload);
  } catch (error) {
    if (isHttpError(error)) {
      throw error;
    }
    throw createHttpError(
      503,
      "Generated document metadata could not be saved.",
      GENERATED_DOCUMENT_ERROR_CODE.SAVE_FAILED,
    );
  }

  const indexing = await safeIndexGeneratedDocument({
    deps,
    document,
    content: generatedText,
  });
  const finalDocument = await maybeUpdateIndexingFields({
    deps,
    document,
    demoSessionId,
    indexing,
  });
  const usageUpdate = await safeUpdateUsageAfterSave({
    deps,
    demoSessionId,
    usageSession,
    sizeBytes,
  });
  const warnings = safeGenerationWarnings(
    generation.warnings,
    [
      ...(indexing.warnings || []),
      usageUpdate.warning,
    ].filter(Boolean),
  );

  let download = {
    available: false,
    filename: filenameMeta.filename,
    downloadUrl: null,
    expiresInSeconds: null,
  };
  if (deps.downloadUrlCreator) {
    try {
      const signed = await deps.downloadUrlCreator({
        documentId,
        demoSessionId,
        requestedFilename: filenameMeta.filename,
      });
      download = {
        available: true,
        filename: signed.filename,
        downloadUrl: signed.downloadUrl,
        expiresInSeconds: signed.expiresInSeconds,
      };
    } catch {
      download = {
        ...download,
        available: false,
      };
    }
  }

  return toGeneratedDocumentResponseDto({
    document: finalDocument,
    generation: {
      ...generation,
      referencesIncluded: includeReferences,
      indexed: indexing.indexed,
      warnings,
    },
    download,
    usage: getUsageSnapshot(usageUpdate.session),
    remaining: getRemainingLimits(usageUpdate.session),
  });
}
