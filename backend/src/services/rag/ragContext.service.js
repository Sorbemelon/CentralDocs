import { DEMO_LIMITS } from "../../config/limits.js";
import { CHAT_SESSION_ERROR_CODE } from "../../constants/chatSession.constants.js";
import { createHttpError, HttpError } from "../../utils/httpError.js";
import { semanticSearch } from "../search/semanticSearch.service.js";
import { buildSearchReference } from "../search/searchReference.service.js";
import { resolveChatSelection } from "../chats/chatSelection.service.js";
import * as defaultChunkRepository from "../indexing/documentChunk.repository.js";
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

function serializeId(value) {
  if (!value) {
    return null;
  }

  return String(value);
}

function documentReferenceIds(reference = {}) {
  return [
    serializeId(reference.documentId),
    serializeId(reference.vectorDocumentId),
  ].filter(Boolean);
}

function documentVectorId(document = {}) {
  return serializeId(document.vectorDocumentId || document._id || document.id);
}

function documentPublicId(document = {}) {
  return serializeId(document.id || document.mockId || document._id);
}

function hasReferenceForDocument(references = [], document = {}) {
  const ids = new Set([documentPublicId(document), documentVectorId(document)].filter(Boolean));
  if (ids.size === 0) return false;
  return references.some((reference) =>
    documentReferenceIds(reference).some((id) => ids.has(id)),
  );
}

function toChunkMatch(chunk = {}, document = {}) {
  return {
    chunkId: serializeId(chunk._id || chunk.id),
    documentId: documentVectorId(document) || serializeId(chunk.documentId),
    chunkIndex: chunk.chunkIndex ?? null,
    content: chunk.content || "",
    contentPreview: String(chunk.content || "").slice(0, 500),
    sourceLocator: chunk.sourceLocator || {},
    chunkKind: chunk.chunkKind || "text",
    embeddingInputType: chunk.embeddingInputType || "text",
    tokenEstimate: chunk.tokenEstimate || 0,
    scope: chunk.scope || document.scope || null,
    score: null,
  };
}

async function buildSupplementalReferencesForMissingDocuments({
  selection = {},
  references = [],
  chunkRepository = defaultChunkRepository,
  visibleLimit = DEMO_LIMITS.visibleReferences,
} = {}) {
  const remainingSlots = Math.max(0, visibleLimit - references.length);
  if (remainingSlots === 0 || typeof chunkRepository?.listChunksForDocument !== "function") {
    return [];
  }

  const supplemental = [];
  for (const document of selection.resolvedDocuments || []) {
    if (supplemental.length >= remainingSlots) break;
    if (hasReferenceForDocument([...references, ...supplemental], document)) continue;

    const vectorId = documentVectorId(document);
    if (!vectorId) continue;

    try {
      const chunks = await chunkRepository.listChunksForDocument({ documentId: vectorId });
      const chunk = chunks?.find((item) => String(item.content || "").trim());
      if (!chunk) continue;
      supplemental.push(
        buildSearchReference({
          match: toChunkMatch(chunk, document),
          document: {
            id: documentPublicId(document),
            title: document.title,
            fileKind: document.fileKind,
            fileType: document.fileKind || document.fileExtension,
            folderName: document.folderName,
          },
          citationNumber: references.length + supplemental.length + 1,
        }),
      );
    } catch {
      continue;
    }
  }

  return supplemental;
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
  chunkRepository = defaultChunkRepository,
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

  const initialReferences = formatReferencesForChatAnswer({
    references: search.references || [],
    visibleLimit: DEMO_LIMITS.visibleReferences,
  });
  const supplementalReferences = await buildSupplementalReferencesForMissingDocuments({
    selection,
    references: initialReferences,
    chunkRepository,
    visibleLimit: DEMO_LIMITS.visibleReferences,
  });
  const references = formatReferencesForChatAnswer({
    references: [...initialReferences, ...supplementalReferences],
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
