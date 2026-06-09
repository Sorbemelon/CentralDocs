import { DEMO_LIMITS } from "../../config/limits.js";
import { CHAT_SESSION_ERROR_CODE } from "../../constants/chatSession.constants.js";
import { createHttpError, HttpError } from "../../utils/httpError.js";
import { semanticSearch } from "../search/semanticSearch.service.js";
import { resolveChatSelection } from "../chats/chatSelection.service.js";
import { formatReferencesForChatAnswer } from "./ragReferenceFormatter.service.js";

function hasSelection(selectedDocumentIds = [], selectedFolderIds = []) {
  return selectedDocumentIds.length > 0 || selectedFolderIds.length > 0;
}

function selectionInputFrom({ chatSession = {}, body = {} } = {}) {
  const hasOverride =
    Object.prototype.hasOwnProperty.call(body, "selectedDocumentIds") ||
    Object.prototype.hasOwnProperty.call(body, "selectedFolderIds");

  return {
    hasOverride,
    selectedDocumentIds: hasOverride
      ? body.selectedDocumentIds || []
      : chatSession.currentSelectedDocumentIds || [],
    selectedFolderIds: hasOverride
      ? body.selectedFolderIds || []
      : chatSession.currentSelectedFolderIds || [],
  };
}

function toRagContextError(error) {
  if (error instanceof HttpError) {
    return error;
  }

  return createHttpError(
    500,
    "RAG context retrieval failed.",
    CHAT_SESSION_ERROR_CODE.RAG_CONTEXT_FAILED,
  );
}

export async function buildRagContext({
  chatSession,
  body = {},
  userPrompt,
  demoSessionId,
  selectionResolver = resolveChatSelection,
  semanticSearcher = semanticSearch,
  selectionRepositories = {},
  searchDependencies = {},
} = {}) {
  const selectionInput = selectionInputFrom({ chatSession, body });
  const selection = await selectionResolver({
    demoSessionId,
    selectedDocumentIds: selectionInput.selectedDocumentIds,
    selectedFolderIds: selectionInput.selectedFolderIds,
    repositories: selectionRepositories,
  });

  if (!hasSelection(selection.selectedDocumentIds, selection.selectedFolderIds)) {
    throw createHttpError(
      400,
      "Select at least one document or folder before asking a document-grounded question.",
      CHAT_SESSION_ERROR_CODE.CHAT_CONTEXT_REQUIRED,
    );
  }

  let search;
  try {
    search = await semanticSearcher({
      body: {
        query: userPrompt,
        selectedDocumentIds: selection.selectedDocumentIds,
        selectedFolderIds: selection.selectedFolderIds,
        scope: "all",
        topK: DEMO_LIMITS.topKRetrieval,
      },
      demoSessionId,
      dependencies: searchDependencies,
    });
  } catch (error) {
    throw toRagContextError(error);
  }

  const references = formatReferencesForChatAnswer({
    references: search.references || [],
    visibleLimit: DEMO_LIMITS.visibleReferences,
  });

  return {
    hasOverride: selectionInput.hasOverride,
    selection,
    search,
    references,
    results: search.results || [],
    scope: search.scope || null,
  };
}
