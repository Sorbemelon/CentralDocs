import { AI_ACTION_TYPE } from "../../constants/ai.constants.js";
import { CHAT_MESSAGE_STATUS, CHAT_ROLE } from "../../constants/chat.constants.js";
import { CHAT_SESSION_ERROR_CODE } from "../../constants/chatSession.constants.js";
import { createHttpError, HttpError } from "../../utils/httpError.js";
import { assertCanSendAiPrompt } from "../demo/demoUsage.service.js";
import { applyDemoSessionUsageDelta, getDemoSession } from "../demo/demoSession.service.js";
import * as defaultChatMessageRepository from "../chats/chatMessage.repository.js";
import { toChatMessageDto } from "../chats/chatMessage.dto.js";
import * as defaultChatSessionRepository from "../chats/chatSession.repository.js";
import { toChatSessionDto } from "../chats/chatSession.dto.js";
import { requireDemoSessionId } from "../chats/chatSession.service.js";
import { generateTextWithLane } from "../ai/geminiGeneration.service.js";
import { buildRagContext } from "./ragContext.service.js";
import { loadRagHistory } from "./ragHistory.service.js";
import { buildRagPrompt } from "./ragPromptBuilder.service.js";
import { toRagAnswerResponseDto } from "./ragAnswer.dto.js";
import { formatReferencesForChatAnswer } from "./ragReferenceFormatter.service.js";

const NO_EVIDENCE_MESSAGE =
  "I could not find relevant source evidence in the selected documents for that question. Try selecting a different document or folder, or ask about material that appears in the selected context.";

const defaultDependencies = Object.freeze({
  chatSessionRepository: defaultChatSessionRepository,
  chatMessageRepository: defaultChatMessageRepository,
  contextBuilder: buildRagContext,
  historyLoader: loadRagHistory,
  promptBuilder: buildRagPrompt,
  generator: generateTextWithLane,
  demoSessionReader: getDemoSession,
  demoSessionUsageUpdater: applyDemoSessionUsageDelta,
  now: () => new Date(),
});

function getDependencies(overrides = {}) {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function assertChatFound(chat) {
  if (!chat) {
    throw createHttpError(
      404,
      "Chat session was not found.",
      CHAT_SESSION_ERROR_CODE.CHAT_NOT_FOUND,
    );
  }

  return chat;
}

function toAiPromptLimitError(error) {
  if (error instanceof HttpError && error.code === "DEMO_LIMIT_REACHED") {
    return createHttpError(
      409,
      "The demo AI prompt limit has been reached.",
      CHAT_SESSION_ERROR_CODE.AI_PROMPT_LIMIT_REACHED,
    );
  }

  return error;
}

function assertAiPromptAvailable(usageSource = {}) {
  try {
    assertCanSendAiPrompt(usageSource);
  } catch (error) {
    throw toAiPromptLimitError(error);
  }
}

async function assertAiPromptAvailableForDemoSession({ deps, demoSessionId, chat } = {}) {
  const session = (await deps.demoSessionReader?.(demoSessionId)) || null;
  assertAiPromptAvailable(session || { usage: { aiPrompts: chat.aiPromptCount || 0 } });
}

function usageFromChat(chat = {}, usageSession = null) {
  const usage = usageSession?.usage || {};
  return {
    uploadedFiles: usage.uploadedFiles || 0,
    chatSessions: usage.chatSessions || 0,
    aiPrompts: usage.aiPrompts ?? chat.aiPromptCount ?? 0,
    generatedDocuments: usage.generatedDocuments || 0,
    userFolders: usage.userFolders || 0,
    storageBytes: usage.storageBytes || 0,
  };
}

function buildAiMeta(generation = {}) {
  return {
    actionType: AI_ACTION_TYPE.CHAT_ANSWER,
    generationModel: generation.model || null,
    fallbackUsed: Boolean(generation.fallbackUsed),
    fallbackLevel: generation.fallbackLevel || 0,
    keySlotUsed: Number.isInteger(generation.keySlot) ? generation.keySlot : null,
    estimatedInputTokens: generation.usage?.estimatedInputTokens || 0,
    estimatedOutputTokens: generation.usage?.estimatedOutputTokens || 0,
    latencyMs: generation.latencyMs ?? null,
  };
}

async function createAssistantMessage({
  deps,
  chat,
  demoSessionId,
  content,
  status = CHAT_MESSAGE_STATUS.COMPLETE,
  referencesUsed = [],
  aiMeta = null,
} = {}) {
  return deps.chatMessageRepository.createMessage({
    chatSessionId: chat._id || chat.id,
    demoSessionId,
    role: CHAT_ROLE.ASSISTANT,
    content,
    status,
    attachedDocumentSnapshot: [],
    attachedFolderSnapshot: [],
    resolvedDocumentSnapshot: [],
    referencesUsed,
    aiMeta,
  });
}

async function rollbackAcceptedUserMessage({ deps, chatId, demoSessionId, userMessage } = {}) {
  const messageId = userMessage?._id || userMessage?.id;
  if (!messageId || typeof deps.chatMessageRepository.deleteMessageById !== "function") {
    return;
  }

  const deleted = await deps.chatMessageRepository.deleteMessageById({
    messageId,
    chatSessionId: chatId,
    demoSessionId,
  });
  if ((deleted?.deletedCount || 0) > 0) {
    await deps.chatSessionRepository.incrementMessageCount({
      chatId,
      demoSessionId,
      at: deps.now(),
      delta: -1,
    });
  }
}

async function recordAiPromptUsage({ deps, demoSessionId } = {}) {
  try {
    return (await deps.demoSessionUsageUpdater?.(demoSessionId, { aiPrompts: 1 })) || null;
  } catch {
    return null;
  }
}

export async function answerChatMessageWithRag({
  chatId,
  demoSessionId,
  content,
  body = {},
  userMessage,
  chatSession,
  ragContext = null,
  dependencies = {},
} = {}) {
  requireDemoSessionId(demoSessionId);
  const deps = getDependencies(dependencies);
  const chat = assertChatFound(chatSession);

  const context =
    ragContext ||
    (await deps.contextBuilder({
      chatSession: chat,
      body,
      userPrompt: content,
      demoSessionId,
      selectionResolver: deps.selectionResolver,
      semanticSearcher: deps.semanticSearcher,
      selectionRepositories: deps.selectionRepositories || {},
      searchDependencies: deps.searchDependencies || {},
      chunkRepository: deps.chunkRepository,
    }));

  if (context.hasOverride) {
    await deps.chatSessionRepository.updateSelection({
      chatId,
      demoSessionId,
      selectedDocumentIds: context.selection.selectedDocumentIds,
      selectedFolderIds: context.selection.selectedFolderIds,
    });
  }

  if (context.references.length === 0) {
    const assistant = await createAssistantMessage({
      deps,
      chat,
      demoSessionId,
      content: NO_EVIDENCE_MESSAGE,
      referencesUsed: [],
      aiMeta: null,
    });
    const updatedChat = assertChatFound(
      await deps.chatSessionRepository.incrementMessageCount({
        chatId,
        demoSessionId,
        at: deps.now(),
      }),
    );

    return toRagAnswerResponseDto({
      chat: toChatSessionDto(updatedChat, {
        resolvedDocumentCount: context.selection.resolvedDocuments.length,
      }),
      userMessage: toChatMessageDto(userMessage),
      assistantMessage: toChatMessageDto(assistant),
      references: [],
      usage: usageFromChat(updatedChat),
    });
  }

  await assertAiPromptAvailableForDemoSession({ deps, demoSessionId, chat });
  const history = await deps.historyLoader({
    chatSession: chat,
    chatSessionId: chatId,
    demoSessionId,
    messageRepository: deps.chatMessageRepository,
  });
  const prompt = deps.promptBuilder({
    userQuestion: content,
    selection: context.selection,
    references: context.references,
    history,
  });

  let generation;
  try {
    generation = await deps.generator({
      prompt: prompt.prompt,
      systemInstruction: prompt.systemInstruction,
      clientFactory: deps.clientFactory,
      keySlots: deps.keySlots,
      options: deps.generationOptions || {},
    });
  } catch (error) {
    await deps.chatSessionRepository.incrementAiPromptCount({
      chatId,
      demoSessionId,
      at: deps.now(),
    });
    await recordAiPromptUsage({ deps, demoSessionId });
    await rollbackAcceptedUserMessage({ deps, chatId, demoSessionId, userMessage });

    if (error instanceof HttpError) {
      throw error;
    }
    throw createHttpError(
      502,
      "RAG chat answer generation failed.",
      CHAT_SESSION_ERROR_CODE.RAG_ANSWER_FAILED,
    );
  }

  const referencesUsed = formatReferencesForChatAnswer({
    references: context.references,
    answerText: generation.text,
  });
  const promptUsageSession = await recordAiPromptUsage({ deps, demoSessionId });
  await deps.chatSessionRepository.incrementAiPromptCount({
    chatId,
    demoSessionId,
    at: deps.now(),
  });
  const assistant = await createAssistantMessage({
    deps,
    chat,
    demoSessionId,
    content: generation.text,
    referencesUsed,
    aiMeta: buildAiMeta(generation),
  });
  const updatedChat = assertChatFound(
    await deps.chatSessionRepository.incrementMessageCount({
      chatId,
      demoSessionId,
      at: deps.now(),
    }),
  );

  return toRagAnswerResponseDto({
    chat: toChatSessionDto(updatedChat, {
      resolvedDocumentCount: context.selection.resolvedDocuments.length,
    }),
    userMessage: toChatMessageDto(userMessage),
    assistantMessage: toChatMessageDto(assistant),
    references: referencesUsed,
    usage: usageFromChat(updatedChat, promptUsageSession),
  });
}
