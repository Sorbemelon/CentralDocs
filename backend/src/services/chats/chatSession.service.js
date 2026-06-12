import { DEMO_LIMITS } from "../../config/limits.js";
import { LIFECYCLE_STATUS } from "../../constants/lifecycle.constants.js";
import {
  CHAT_SESSION_DEFAULTS,
  CHAT_SESSION_ERROR_CODE,
  CHAT_SESSION_LIMITS,
} from "../../constants/chatSession.constants.js";
import { createHttpError, HttpError } from "../../utils/httpError.js";
import { applyDemoSessionUsageDelta, getDemoSession } from "../demo/demoSession.service.js";
import {
  assertCanCreateChat,
  buildChatLifecycleUsageDelta,
  getRemainingLimits,
  getUsageSnapshot,
} from "../demo/demoUsage.service.js";
import * as defaultChatMessageRepository from "./chatMessage.repository.js";
import * as defaultChatSessionRepository from "./chatSession.repository.js";
import { toChatMessageDtos } from "./chatMessage.dto.js";
import { toChatSessionDto, toChatSessionDtos } from "./chatSession.dto.js";
import { resolveChatSelection } from "./chatSelection.service.js";

const defaultDependencies = Object.freeze({
  chatSessionRepository: defaultChatSessionRepository,
  chatMessageRepository: defaultChatMessageRepository,
  messageDtoMapper: toChatMessageDtos,
  selectionResolver: resolveChatSelection,
  demoSessionReader: getDemoSession,
  demoSessionUsageUpdater: applyDemoSessionUsageDelta,
  now: () => new Date(),
});

let chatSessionTestDependencies = {};

function getDependencies(overrides = {}) {
  return {
    ...defaultDependencies,
    ...chatSessionTestDependencies,
    ...overrides,
  };
}

export function setChatSessionDependenciesForTests(overrides = {}) {
  chatSessionTestDependencies = overrides;
}

export function resetChatSessionDependenciesForTests() {
  chatSessionTestDependencies = {};
}

export function requireDemoSessionId(demoSessionId) {
  if (!demoSessionId) {
    throw createHttpError(
      401,
      "An active demo session is required for chat sessions.",
      CHAT_SESSION_ERROR_CODE.SESSION_NOT_FOUND,
    );
  }

  return demoSessionId;
}

export function validateChatTitle(title, { required = false } = {}) {
  if (title === undefined || title === null) {
    if (required) {
      throw createHttpError(
        400,
        "Chat title is required.",
        CHAT_SESSION_ERROR_CODE.CHAT_TITLE_INVALID,
      );
    }
    return CHAT_SESSION_DEFAULTS.title;
  }

  const trimmed = String(title).trim();
  if (!trimmed || trimmed.length > CHAT_SESSION_LIMITS.maxTitleLength) {
    throw createHttpError(
      400,
      `Chat title must be between 1 and ${CHAT_SESSION_LIMITS.maxTitleLength} characters.`,
      CHAT_SESSION_ERROR_CODE.CHAT_TITLE_INVALID,
    );
  }

  return trimmed;
}

function getChatPublicId(chat) {
  return String(chat?.id || chat?._id || "");
}

export function buildUniqueChatTitle(preferredTitle, existingChats = [], { excludeChatId = null } = {}) {
  const baseTitle = validateChatTitle(preferredTitle);
  const excludedId = excludeChatId ? String(excludeChatId) : null;
  const existing = new Set(
    existingChats
      .filter((chat) => !excludedId || getChatPublicId(chat) !== excludedId)
      .map((chat) => String(chat?.title || "").trim().toLowerCase())
      .filter(Boolean),
  );

  if (!existing.has(baseTitle.toLowerCase())) {
    return baseTitle;
  }

  for (let index = 2; index <= existing.size + 2; index += 1) {
    const suffix = ` (${index})`;
    const stemMax = CHAT_SESSION_LIMITS.maxTitleLength - suffix.length;
    const stem = baseTitle.slice(0, stemMax).trimEnd() || CHAT_SESSION_DEFAULTS.title;
    const candidate = `${stem}${suffix}`;
    if (!existing.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  const suffix = ` (${Date.now()})`;
  return `${baseTitle.slice(0, CHAT_SESSION_LIMITS.maxTitleLength - suffix.length).trimEnd()}${suffix}`;
}

function toChatSessionLimitError(error) {
  if (error instanceof HttpError && error.code === "DEMO_LIMIT_REACHED") {
    return createHttpError(
      409,
      "The demo saved chat session limit has been reached.",
      CHAT_SESSION_ERROR_CODE.CHAT_SESSION_LIMIT_REACHED,
    );
  }

  return error;
}

function assertChatSessionLimit(usageSource) {
  try {
    assertCanCreateChat(usageSource);
  } catch (error) {
    throw toChatSessionLimitError(error);
  }
}

function countChatStates(chats = []) {
  return chats.reduce(
    (counts, chat) => {
      if (chat.lifecycleStatus === LIFECYCLE_STATUS.TRASHED) {
        counts.trashed += 1;
      } else if (chat.archivedAt) {
        counts.archived += 1;
      } else {
        counts.active += 1;
      }
      return counts;
    },
    { active: 0, archived: 0, trashed: 0 },
  );
}

async function getChatUsageSession({ deps, demoSessionId, activeSessionCount = 0 } = {}) {
  const session = await deps.demoSessionReader?.(demoSessionId);
  const usage = getUsageSnapshot(session || { usage: { chatSessions: activeSessionCount } });

  return {
    ...(session || {}),
    usage: {
      ...usage,
      chatSessions: Math.max(usage.chatSessions, activeSessionCount),
    },
  };
}

async function buildChatLimitSummary({ deps, demoSessionId, activeSessionCount }) {
  const usageSession = await getChatUsageSession({ deps, demoSessionId, activeSessionCount });

  return {
    limits: { ...DEMO_LIMITS },
    remaining: getRemainingLimits(usageSession),
  };
}

async function applyChatLifecycleUsageDelta({
  deps,
  demoSessionId,
  direction,
} = {}) {
  try {
    const delta = buildChatLifecycleUsageDelta(direction);
    if (Object.keys(delta).length === 0) {
      return null;
    }

    const session = await deps.demoSessionUsageUpdater?.(demoSessionId, delta);
    return session
      ? {
          usage: getUsageSnapshot(session),
          remaining: getRemainingLimits(session),
        }
      : null;
  } catch {
    return null;
  }
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

export async function listSavedChatSessions({
  demoSessionId,
  dependencies = {},
} = {}) {
  requireDemoSessionId(demoSessionId);
  const deps = getDependencies(dependencies);
  const chats = await deps.chatSessionRepository.listChatSessionsByDemoSession({
    demoSessionId,
    includeTrash: true,
  });
  const visibleChats = chats.filter((chat) => chat.lifecycleStatus === LIFECYCLE_STATUS.ACTIVE);
  const counts = countChatStates(chats);

  return {
    chats: toChatSessionDtos(visibleChats),
    counts,
    ...(await buildChatLimitSummary({
      deps,
      demoSessionId,
      activeSessionCount: visibleChats.length,
    })),
  };
}

export async function createSavedChatSession({
  demoSessionId,
  body = {},
  dependencies = {},
} = {}) {
  requireDemoSessionId(demoSessionId);
  const deps = getDependencies(dependencies);
  const activeCount = await deps.chatSessionRepository.countActiveChatSessionsByDemoSession({
    demoSessionId,
  });
  assertChatSessionLimit(
    await getChatUsageSession({
      deps,
      demoSessionId,
      activeSessionCount: activeCount,
    }),
  );

  const selection = await deps.selectionResolver({
    demoSessionId,
    selectedDocumentIds: body.selectedDocumentIds,
    selectedFolderIds: body.selectedFolderIds,
    repositories: deps.selectionRepositories || {},
  });
  const activeChats = await deps.chatSessionRepository.listChatSessionsByDemoSession({
    demoSessionId,
    includeTrash: false,
  });
  const chat = await deps.chatSessionRepository.createChatSession({
    demoSessionId,
    title: buildUniqueChatTitle(body.title, activeChats),
    selectedDocumentIds: selection.selectedDocumentIds,
    selectedFolderIds: selection.selectedFolderIds,
  });
  const usagePatch = await applyChatLifecycleUsageDelta({
    deps,
    demoSessionId,
    direction: "create",
  });

  return {
    chat: toChatSessionDto(chat, { resolvedDocumentCount: selection.resolvedDocuments.length }),
    selection: toSelectionDto(selection),
    ...(usagePatch || {}),
  };
}

export async function getSavedChatSession({
  chatId,
  demoSessionId,
  includeTrash = false,
  dependencies = {},
} = {}) {
  requireDemoSessionId(demoSessionId);
  const deps = getDependencies(dependencies);
  return assertChatFound(
    await deps.chatSessionRepository.getChatSessionById({
      chatId,
      demoSessionId,
      includeTrash,
    }),
  );
}

export async function getSavedChatSessionDetail({
  chatId,
  demoSessionId,
  dependencies = {},
} = {}) {
  const deps = getDependencies(dependencies);
  const chat = await getSavedChatSession({ chatId, demoSessionId, dependencies: deps });
  const selection = await deps.selectionResolver({
    demoSessionId,
    selectedDocumentIds: chat.currentSelectedDocumentIds,
    selectedFolderIds: chat.currentSelectedFolderIds,
    repositories: deps.selectionRepositories || {},
  });
  const messages = await deps.chatMessageRepository.listMessagesByChatSession({
    chatSessionId: chatId,
    demoSessionId,
  });

  return {
    chat: toChatSessionDto(chat, { resolvedDocumentCount: selection.resolvedDocuments.length }),
    messages: deps.messageDtoMapper(messages),
    selection: toSelectionDto(selection),
  };
}

export async function updateSavedChatSession({
  chatId,
  demoSessionId,
  body = {},
  dependencies = {},
} = {}) {
  const deps = getDependencies(dependencies);
  await getSavedChatSession({ chatId, demoSessionId, dependencies: deps });

  const patch = {};
  if (body.title !== undefined) {
    const activeChats = await deps.chatSessionRepository.listChatSessionsByDemoSession({
      demoSessionId,
      includeTrash: false,
    });
    patch.title = buildUniqueChatTitle(validateChatTitle(body.title, { required: true }), activeChats, {
      excludeChatId: chatId,
    });
  }
  if (body.archived !== undefined) {
    patch.archivedAt = body.archived ? deps.now() : null;
  }

  if (Object.keys(patch).length === 0) {
    throw createHttpError(
      400,
      "No supported chat session updates were provided.",
      CHAT_SESSION_ERROR_CODE.INVALID_REQUEST,
    );
  }

  const updated = assertChatFound(
    await deps.chatSessionRepository.updateChatSession({
      chatId,
      demoSessionId,
      patch,
    }),
  );

  return { chat: toChatSessionDto(updated) };
}

export async function deleteSavedChatSession({
  chatId,
  demoSessionId,
  dependencies = {},
} = {}) {
  const deps = getDependencies(dependencies);
  await getSavedChatSession({ chatId, demoSessionId, dependencies: deps });
  const trashed = assertChatFound(
    await deps.chatSessionRepository.softDeleteChatSession({ chatId, demoSessionId }),
  );
  const usagePatch = await applyChatLifecycleUsageDelta({
    deps,
    demoSessionId,
    direction: "delete",
  });

  return {
    status: "trashed",
    chat: toChatSessionDto(trashed),
    ...(usagePatch || {}),
  };
}

export async function updateChatSelection({
  chatId,
  demoSessionId,
  body = {},
  dependencies = {},
} = {}) {
  const deps = getDependencies(dependencies);
  await getSavedChatSession({ chatId, demoSessionId, dependencies: deps });
  const selection = await deps.selectionResolver({
    demoSessionId,
    selectedDocumentIds: body.selectedDocumentIds,
    selectedFolderIds: body.selectedFolderIds,
    repositories: deps.selectionRepositories || {},
  });
  const updated = assertChatFound(
    await deps.chatSessionRepository.updateSelection({
      chatId,
      demoSessionId,
      selectedDocumentIds: selection.selectedDocumentIds,
      selectedFolderIds: selection.selectedFolderIds,
    }),
  );

  return {
    chat: toChatSessionDto(updated, { resolvedDocumentCount: selection.resolvedDocuments.length }),
    selection: toSelectionDto(selection),
  };
}

export function toSelectionDto(selection = {}) {
  return {
    selectedDocumentIds: selection.selectedDocumentIds || [],
    selectedFolderIds: selection.selectedFolderIds || [],
    resolvedDocuments: selection.snapshots?.resolvedDocumentSnapshot || [],
  };
}
