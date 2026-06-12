import { DEMO_LIMITS } from "../../config/limits.js";
import { CHAT_MESSAGE_STATUS, CHAT_ROLE } from "../../constants/chat.constants.js";
import { CHAT_SESSION_ERROR_CODE } from "../../constants/chatSession.constants.js";
import { createHttpError, HttpError } from "../../utils/httpError.js";
import { assertPromptLength } from "../demo/demoUsage.service.js";
import * as defaultChatMessageRepository from "./chatMessage.repository.js";
import { toChatMessageDto } from "./chatMessage.dto.js";
import * as defaultChatSessionRepository from "./chatSession.repository.js";
import { toChatSessionDto } from "./chatSession.dto.js";
import {
  requireDemoSessionId,
  toSelectionDto,
} from "./chatSession.service.js";
import { resolveChatSelection } from "./chatSelection.service.js";
import { buildRagContext } from "../rag/ragContext.service.js";
import { answerChatMessageWithRag } from "../rag/ragAnswer.service.js";
import { assertHiddenIpQuotaAvailable } from "../demo/demoIpQuota.service.js";

const defaultDependencies = Object.freeze({
  chatSessionRepository: defaultChatSessionRepository,
  chatMessageRepository: defaultChatMessageRepository,
  selectionResolver: resolveChatSelection,
  contextBuilder: buildRagContext,
  ragAnswerer: answerChatMessageWithRag,
  hiddenQuotaGuard: assertHiddenIpQuotaAvailable,
  now: () => new Date(),
});

let chatMessageTestDependencies = {};

function getDependencies(overrides = {}) {
  return {
    ...defaultDependencies,
    ...chatMessageTestDependencies,
    ...overrides,
  };
}

export function setChatMessageDependenciesForTests(overrides = {}) {
  chatMessageTestDependencies = overrides;
}

export function resetChatMessageDependenciesForTests() {
  chatMessageTestDependencies = {};
}

function validateMessageContent(content) {
  const trimmed = String(content || "").trim();
  if (!trimmed) {
    throw createHttpError(
      400,
      "Chat message content is required.",
      CHAT_SESSION_ERROR_CODE.CHAT_MESSAGE_EMPTY,
    );
  }

  try {
    assertPromptLength(trimmed);
  } catch (error) {
    if (error instanceof HttpError && error.code === "DEMO_LIMIT_REACHED") {
      throw createHttpError(
        400,
        `Chat message must be ${DEMO_LIMITS.maxPromptLengthChars} characters or fewer.`,
        CHAT_SESSION_ERROR_CODE.CHAT_MESSAGE_TOO_LONG,
      );
    }
    throw error;
  }

  return trimmed;
}

function hasSelectionOverride(body = {}) {
  return (
    Object.prototype.hasOwnProperty.call(body, "selectedDocumentIds") ||
    Object.prototype.hasOwnProperty.call(body, "selectedFolderIds")
  );
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

export async function createUserChatMessage({
  chatId,
  demoSessionId,
  body = {},
  dependencies = {},
} = {}) {
  requireDemoSessionId(demoSessionId);
  const deps = getDependencies(dependencies);
  const content = validateMessageContent(body.content);
  const chat = assertChatFound(
    await deps.chatSessionRepository.getChatSessionById({ chatId, demoSessionId }),
  );

  const selectionInput = hasSelectionOverride(body)
    ? {
        selectedDocumentIds: body.selectedDocumentIds,
        selectedFolderIds: body.selectedFolderIds,
      }
    : {
        selectedDocumentIds: chat.currentSelectedDocumentIds,
        selectedFolderIds: chat.currentSelectedFolderIds,
      };

  const selection = await deps.selectionResolver({
    demoSessionId,
    ...selectionInput,
    repositories: deps.selectionRepositories || {},
  });

  let selectedChat = chat;
  if (hasSelectionOverride(body)) {
    selectedChat = assertChatFound(
      await deps.chatSessionRepository.updateSelection({
        chatId,
        demoSessionId,
        selectedDocumentIds: selection.selectedDocumentIds,
        selectedFolderIds: selection.selectedFolderIds,
      }),
    );
  }

  const message = await deps.chatMessageRepository.createMessage({
    chatSessionId: selectedChat._id || selectedChat.id,
    demoSessionId,
    role: CHAT_ROLE.USER,
    content,
    status: CHAT_MESSAGE_STATUS.COMPLETE,
    attachedDocumentSnapshot: selection.snapshots.attachedDocumentSnapshot,
    attachedFolderSnapshot: selection.snapshots.attachedFolderSnapshot,
    resolvedDocumentSnapshot: selection.snapshots.resolvedDocumentSnapshot,
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

  return {
    message: toChatMessageDto(message),
    chat: toChatSessionDto(updatedChat, {
      resolvedDocumentCount: selection.resolvedDocuments.length,
    }),
    selection: toSelectionDto(selection),
  };
}

export async function createChatMessageWithRagAnswer({
  chatId,
  demoSessionId,
  quotaIdentity = null,
  body = {},
  dependencies = {},
} = {}) {
  requireDemoSessionId(demoSessionId);
  const deps = getDependencies(dependencies);
  const content = validateMessageContent(body.content);
  const chat = assertChatFound(
    await deps.chatSessionRepository.getChatSessionById({ chatId, demoSessionId }),
  );
  const ragContext = await deps.contextBuilder({
    chatSession: chat,
    body,
    userPrompt: content,
    demoSessionId,
    selectionResolver: deps.selectionResolver,
    semanticSearcher: deps.semanticSearcher,
    selectionRepositories: deps.selectionRepositories || {},
    searchDependencies: deps.searchDependencies || {},
  });
  if (ragContext.references.length > 0) {
    await deps.hiddenQuotaGuard?.({
      quotaIdentity,
      delta: { aiPrompts: 1 },
      repository: deps.hiddenQuotaRepository,
    });
  }

  let selectedChat = chat;
  if (ragContext.hasOverride) {
    selectedChat = assertChatFound(
      await deps.chatSessionRepository.updateSelection({
        chatId,
        demoSessionId,
        selectedDocumentIds: ragContext.selection.selectedDocumentIds,
        selectedFolderIds: ragContext.selection.selectedFolderIds,
      }),
    );
  }

  const userMessage = await deps.chatMessageRepository.createMessage({
    chatSessionId: selectedChat._id || selectedChat.id,
    demoSessionId,
    role: CHAT_ROLE.USER,
    content,
    status: CHAT_MESSAGE_STATUS.COMPLETE,
    attachedDocumentSnapshot: ragContext.selection.snapshots.attachedDocumentSnapshot,
    attachedFolderSnapshot: ragContext.selection.snapshots.attachedFolderSnapshot,
    resolvedDocumentSnapshot: ragContext.selection.snapshots.resolvedDocumentSnapshot,
    referencesUsed: [],
    aiMeta: null,
  });
  const chatAfterUser = assertChatFound(
    await deps.chatSessionRepository.incrementMessageCount({
      chatId,
      demoSessionId,
      at: deps.now(),
    }),
  );

  return deps.ragAnswerer({
    chatId,
    demoSessionId,
    content,
    body,
    userMessage,
    chatSession: chatAfterUser,
    ragContext,
    dependencies: {
      ...deps,
      quotaIdentity,
    },
  });
}
