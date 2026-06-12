import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { clearDemoSessionId } from "@/lib/apiClient";
import { DEMO_LIMITS, SOURCE_FILTER, SOURCE_KIND } from "@/lib/constants";
import {
  isLocalChatId,
  normalizeChat,
  normalizeDocument,
  normalizeUsage,
  normalizeUsageFromSnapshot,
} from "@/lib/workspaceData";
import { useDemoSession } from "@/lib/useDemoSession";
import { useWorkspaceData } from "@/lib/useWorkspaceData";
import { useChatSessions } from "@/lib/useChatSessions";
import { useSelectedContext } from "@/lib/useSelectedContext";
import { useSemanticSearch } from "@/lib/useSemanticSearch";
import { useChatMessages } from "@/lib/useChatMessages";
import { useGeneratedDocuments } from "@/lib/useGeneratedDocuments";
import { updateChatSelection } from "@/services/chatApi";
import { clearDemoSession, getDemoSession } from "@/services/demoApi";
import {
  createDownloadUrl,
  deleteDocument as apiDeleteDocument,
  moveDocument as apiMoveDocument,
  restoreDocument as apiRestoreDocument,
  retryDocument as apiRetryDocument,
  uploadDocument as apiUploadDocument,
} from "@/services/documentApi";
import {
  createFolder as apiCreateFolder,
  deleteFolder as apiDeleteFolder,
  renameFolder as apiRenameFolder,
  restoreFolder as apiRestoreFolder,
} from "@/services/folderApi";
import { CLEAR_SESSION_DIALOG, DELETE_CONFIRM } from "@/data/demoCopy";
import { ConfirmDialog, PromptDialog, ChoiceDialog } from "@/components/ui/dialog";
import { WorkspaceTopBar } from "./WorkspaceTopBar";
import { SourceSidebar } from "./SourceSidebar";
import { MainWorkspacePanel } from "./MainWorkspacePanel";
import { RightContextPanel } from "./RightContextPanel";
import { GenerateDocumentModalShell } from "./GenerateDocumentModalShell";

function buildUniqueFolderName(baseName, existingNames = []) {
  const normalizedExisting = new Set(existingNames.map((name) => String(name || "").trim().toLowerCase()));
  if (!normalizedExisting.has(baseName.toLowerCase())) return baseName;

  for (let index = 2; index <= existingNames.length + 2; index += 1) {
    const candidate = `${baseName} (${index})`;
    if (!normalizedExisting.has(candidate.toLowerCase())) return candidate;
  }

  return `${baseName} (${Date.now()})`;
}

/**
 * One compact workspace route. Wires backend folders/documents/trash/chats,
 * demo session/bootstrap, upload, search, RAG chat, generated documents, and
 * management actions while degrading gracefully to the offline fallback.
 */
export default function CentralDocsWorkspace() {
  const navigate = useNavigate();
  const demo = useDemoSession({ requireExistingSession: true });
  const online = demo.online;

  const [activeTab, setActiveTab] = useState("chat");
  const [sourceFilter, setSourceFilter] = useState(SOURCE_FILTER.active);
  const [previewDocId, setPreviewDocId] = useState(null);
  const [sourcesDrawer, setSourcesDrawer] = useState(false);
  const [contextDrawer, setContextDrawer] = useState(false);
  const [operation, setOperation] = useState(null); // { kind, status, label }
  const [usageOverride, setUsageOverride] = useState(null);
  const [dialog, setDialog] = useState(null); // { type: 'confirm'|'rename'|'move', ... }

  const wsData = useWorkspaceData({ online, bootstrap: demo.bootstrap, filter: sourceFilter });
  const chats = useChatSessions({ online });

  useEffect(() => {
    if (demo.needsLaunch) navigate("/", { replace: true });
  }, [demo.needsLaunch, navigate]);

  // Persist selection to the active backend chat (no-op offline / local chat).
  const persistSelection = useCallback(
    (docIds, folderIds) => {
      const id = chats.activeChatId;
      if (!online || !id || isLocalChatId(id)) return;
      updateChatSelection(id, {
        selectedDocumentIds: docIds,
        selectedFolderIds: folderIds,
      }).catch(() => toast.error("Couldn't sync selection to the chat"));
    },
    [online, chats.activeChatId],
  );

  const selection = useSelectedContext({ onPersist: persistSelection });

  // Semantic search (Search tab) — defaults to the active chat's selected context.
  const search = useSemanticSearch({
    online,
    selectedDocumentIds: selection.docIds,
    selectedFolderIds: selection.folderIds,
  });

  const applyUsageSnapshot = useCallback(
    (snapshot) => {
      if (!snapshot) return;
      setUsageOverride((prev) => {
        const base = prev ?? demo.usage;
        return normalizeUsageFromSnapshot(snapshot, base);
      });
    },
    [demo.usage],
  );

  // Merge only the prompt counter from a chat response (other counters stay).
  const mergePromptUsage = useCallback(
    (aiPrompts) => {
      applyUsageSnapshot({ aiPrompts });
    },
    [applyUsageSnapshot],
  );

  // RAG chat (Chat tab) — sends with the active chat's selected context.
  const chat = useChatMessages({
    online,
    activeChatId: chats.activeChatId,
    selectedDocumentIds: selection.docIds,
    selectedFolderIds: selection.folderIds,
    onChatUpdated: (chatDto) => chats.applyChat(normalizeChat(chatDto)),
    onPromptUsage: mergePromptUsage,
    onUsageSnapshot: applyUsageSnapshot,
  });

  // Generate Document (Chat header) — turns the active chat into a saved document.
  const generate = useGeneratedDocuments({
    online,
    activeChatId: chats.activeChatId,
    existingGeneratedDocuments: wsData.generated,
    onGenerated: (doc, res) => {
      wsData.applyDocument(doc);
      wsData.reloadActive();
      if (res?.usage) applyUsageSnapshot(res.usage);
    },
  });

  const { folders, documents } = wsData;
  const getDocById = useCallback((id) => documents.find((d) => d.id === id) || null, [documents]);
  const getFolderById = useCallback((id) => folders.find((f) => f.id === id) || null, [folders]);

  // Folder hierarchy (children grouped by parent id; unknown parents go to root).
  const folderChildren = useMemo(() => {
    const ids = new Set(folders.map((f) => f.id));
    const map = new Map();
    folders.forEach((f) => {
      const key = f.parentFolderId && ids.has(f.parentFolderId) ? f.parentFolderId : null;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(f);
    });
    return map;
  }, [folders]);

  const getDescendantFolderIds = useCallback(
    (folderId) => {
      const ids = [];
      const walk = (id) => {
        (folderChildren.get(id) || []).forEach((child) => {
          ids.push(child.id);
          walk(child.id);
        });
      };
      walk(folderId);
      return ids;
    },
    [folderChildren],
  );

  const getFolderLineage = useCallback(
    (folderId) => {
      const lineage = [];
      let current = getFolderById(folderId);
      const visited = new Set();
      while (current?.parentFolderId && !visited.has(current.parentFolderId)) {
        visited.add(current.parentFolderId);
        lineage.push(current.parentFolderId);
        current = getFolderById(current.parentFolderId);
      }
      return lineage;
    },
    [getFolderById],
  );

  const normalizeSelectionForHierarchy = useCallback(
    ({ selectedDocumentIds = [], selectedFolderIds = [] } = {}) => {
      const folderSet = new Set(selectedFolderIds);
      const prunedFolderIds = [...folderSet].filter(
        (folderId) => !getFolderLineage(folderId).some((ancestorId) => folderSet.has(ancestorId)),
      );
      const effectiveFolders = new Set(prunedFolderIds);
      prunedFolderIds.forEach((folderId) => {
        getDescendantFolderIds(folderId).forEach((descendantId) => effectiveFolders.add(descendantId));
      });
      const prunedDocumentIds = [...new Set(selectedDocumentIds)].filter((docId) => {
        const doc = documents.find((item) => item.id === docId);
        return !doc || !effectiveFolders.has(doc.folderId);
      });

      return {
        selectedDocumentIds: prunedDocumentIds,
        selectedFolderIds: prunedFolderIds,
      };
    },
    [documents, getDescendantFolderIds, getFolderLineage],
  );

  const countEffectiveContextDocuments = useCallback(
    ({ selectedDocumentIds = [], selectedFolderIds = [] } = {}) => {
      const effectiveFolders = new Set(selectedFolderIds);
      selectedFolderIds.forEach((folderId) => {
        getDescendantFolderIds(folderId).forEach((descendantId) => effectiveFolders.add(descendantId));
      });

      const docSet = new Set(selectedDocumentIds);
      documents.forEach((doc) => {
        if (effectiveFolders.has(doc.folderId)) docSet.add(doc.id);
      });
      return docSet.size;
    },
    [documents, getDescendantFolderIds],
  );

  const canApplyContextSelection = useCallback(
    (nextSelection) => {
      const nextCount = countEffectiveContextDocuments(nextSelection);
      const limit = DEMO_LIMITS.contextSelectionDocumentLimit;

      if (nextCount > limit) {
        toast.error(`Select up to ${limit} documents`, {
          description: "Remove a source before adding more context.",
        });
        return false;
      }

      return true;
    },
    [countEffectiveContextDocuments],
  );

  // Hydrate selected context from the active chat's persisted selection.
  useEffect(() => {
    if (chats.activeSelection) selection.setFromChat(normalizeSelectionForHierarchy(chats.activeSelection));
  }, [chats.activeSelection, normalizeSelectionForHierarchy, selection.setFromChat]);

  // --- selection wrappers (toast + local/remote handled by the hook) ---
  const attach = useCallback(
    (kind, id) => {
      if (kind === "document") {
        const doc = documents.find((d) => d.id === id);
        if (doc && doc.attachable === false) {
          toast.error("This document isn't ready to attach yet.");
          return;
        }
        const next = normalizeSelectionForHierarchy({
          selectedDocumentIds: [...selection.docIds, id],
          selectedFolderIds: selection.folderIds,
        });
        if (!canApplyContextSelection(next)) return;
        selection.setFromChat(next);
        persistSelection(next.selectedDocumentIds, next.selectedFolderIds);
      } else {
        const next = normalizeSelectionForHierarchy({
          selectedDocumentIds: selection.docIds,
          selectedFolderIds: [...selection.folderIds, id],
        });
        if (!canApplyContextSelection(next)) return;
        selection.setFromChat(next);
        persistSelection(next.selectedDocumentIds, next.selectedFolderIds);
      }
      toast.success(kind === "folder" ? "Folder attached to context" : "Document attached to context");
    },
    [selection, documents, normalizeSelectionForHierarchy, canApplyContextSelection, persistSelection],
  );
  const detach = useCallback(
    (kind, id) => {
      if (kind === "folder") {
        const folderIdsToRemove = new Set([id, ...getDescendantFolderIds(id)]);
        const docIdsToRemove = new Set(
          documents.filter((doc) => folderIdsToRemove.has(doc.folderId)).map((doc) => doc.id),
        );
        const next = {
          selectedDocumentIds: selection.docIds.filter((docId) => !docIdsToRemove.has(docId)),
          selectedFolderIds: selection.folderIds.filter((folderId) => !folderIdsToRemove.has(folderId)),
        };
        selection.setFromChat(next);
        persistSelection(next.selectedDocumentIds, next.selectedFolderIds);
        return;
      }
      selection.detach(kind, id);
    },
    [documents, getDescendantFolderIds, persistSelection, selection],
  );
  const clearSelection = selection.clear;

  // Refresh demo usage after actions that change counts (delete/restore have no usage in their response).
  const refreshUsage = useCallback(async () => {
    if (!online) return;
    try {
      const res = await getDemoSession();
      if (res?.session) {
        setUsageOverride((prev) => normalizeUsageFromSnapshot(res.session.usage, prev ?? demo.usage));
      }
    } catch {
      /* keep previous usage values */
    }
  }, [demo.usage, online]);

  const notifyBackendRequired = useCallback((action = "This action") => {
    toast.error(`${action} needs the backend.`, {
      description: "The demo is currently running with local fallback data.",
    });
  }, []);

  // Online-only management actions degrade to a clear offline note.
  const notifyOffline = useCallback(() => {
    toast.error("This action needs the backend — you're offline.");
  }, []);

  const openPreview = useCallback((id) => {
    setPreviewDocId(id);
    setActiveTab("preview");
  }, []);

  const setActiveChat = useCallback(
    (id) => {
      chats.setActiveChat(id);
      setActiveTab("chat");
    },
    [chats],
  );

  const newChat = useCallback(
    () =>
      chats.newChat({
        selectedDocumentIds: selection.docIds,
        selectedFolderIds: selection.folderIds,
      }),
    [chats, selection.docIds, selection.folderIds],
  );

  // --- source actions (wired when online + reversible; toast otherwise) ---
  const deleteDocument = useCallback(
    async (doc) => {
      if (doc.readOnly) return;
      if (!online) return notifyBackendRequired("Delete document");
      try {
        await apiDeleteDocument(doc.id);
        selection.detach("document", doc.id);
        toast.success("Document moved to Trash");
        wsData.reloadActive();
        if (sourceFilter === SOURCE_FILTER.trash) wsData.reloadTrash();
        refreshUsage();
      } catch {
        toast.error("Couldn't delete the document");
      }
    },
    [online, notifyBackendRequired, selection, wsData, sourceFilter, refreshUsage],
  );

  const deleteFolder = useCallback(
    async (folder) => {
      if (folder.readOnly) return;
      if (!online) return notifyBackendRequired("Delete folder");
      try {
        await apiDeleteFolder(folder.id);
        const folderIdsToDetach = new Set([folder.id]);
        const collectDescendantFolders = (folderId) => {
          (folderChildren.get(folderId) || []).forEach((child) => {
            folderIdsToDetach.add(child.id);
            collectDescendantFolders(child.id);
          });
        };
        collectDescendantFolders(folder.id);
        const docIdsToDetach = new Set(
          documents.filter((doc) => folderIdsToDetach.has(doc.folderId)).map((doc) => doc.id),
        );
        const nextFolderIds = selection.folderIds.filter((folderId) => !folderIdsToDetach.has(folderId));
        const nextDocIds = selection.docIds.filter((docId) => !docIdsToDetach.has(docId));
        selection.setFromChat({
          selectedDocumentIds: nextDocIds,
          selectedFolderIds: nextFolderIds,
        });
        persistSelection(nextDocIds, nextFolderIds);
        toast.success("Folder moved to Trash");
        wsData.reloadActive();
        refreshUsage();
      } catch {
        toast.error("Couldn't delete the folder");
      }
    },
    [online, notifyBackendRequired, selection, persistSelection, wsData, refreshUsage, folderChildren, documents],
  );

  const downloadDocument = useCallback(
    async (doc) => {
      if (!online) return notifyBackendRequired("Download");
      if (doc.downloadAvailable === false) {
        toast.error("This document isn't available to download.");
        return;
      }
      try {
        const res = await createDownloadUrl(doc.id);
        const url = res?.downloadUrl || res?.url || res?.download?.url;
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        else toast.error("No download link was returned.");
      } catch {
        toast.error("Couldn't create a download link");
      }
    },
    [online, notifyBackendRequired],
  );

  // --- upload + retry ---
  const uploadDocument = useCallback(
    async (file) => {
      if (!online) {
        notifyBackendRequired("Upload");
        return { ok: false };
      }
      setOperation({ kind: "upload", status: "uploading", label: `Uploading ${file.name}` });
      try {
        const res = await apiUploadDocument({ file });
        const doc = normalizeDocument(res.document);
        wsData.applyDocument(doc);
        wsData.reloadActive();
        if (res.usage) applyUsageSnapshot(res.usage);
        const failed = doc.status === "failed";
        setOperation({
          kind: "upload",
          status: failed ? "failed" : "complete",
          label: failed ? `Upload failed: ${doc.title}` : `Upload complete: ${doc.title}`,
        });
        if (failed) toast.error(`Processing failed for ${doc.title}`);
        else toast.success(`Uploaded ${doc.title}`);
        setPreviewDocId(doc.id);
        setActiveTab("preview");
        return { ok: true, doc };
      } catch (err) {
        setOperation({ kind: "upload", status: "failed", label: "Upload failed" });
        toast.error(err?.message || "Upload failed");
        return { ok: false, error: err };
      }
    },
    [online, notifyBackendRequired, wsData, applyUsageSnapshot],
  );

  const retryDocument = useCallback(
    async (doc) => {
      if (!online) return notifyBackendRequired("Retry");
      setOperation({ kind: "retry", status: "processing", label: `Retrying ${doc.title}` });
      try {
        const res = await apiRetryDocument(doc.id);
        const next = normalizeDocument(res.document);
        wsData.applyDocument(next);
        wsData.reloadActive();
        const failed = next.status === "failed";
        setOperation({
          kind: "retry",
          status: failed ? "failed" : "complete",
          label: failed ? `Retry failed: ${next.title}` : `Retry complete: ${next.title}`,
        });
        if (failed) toast.error(`Retry failed for ${next.title}`);
        else toast.success(`Reprocessed ${next.title}`);
      } catch (err) {
        setOperation({ kind: "retry", status: "failed", label: "Retry failed" });
        toast.error(err?.message || "Couldn't retry processing");
      }
    },
    [online, notifyBackendRequired, wsData],
  );

  // Create a folder at the tree root or inside a user folder (parentFolderId).
  const createFolder = useCallback(
    async (parentFolderId) => {
      if (!online) return notifyBackendRequired("Create folder");
      try {
        const targetParentId = parentFolderId || null;
        const siblingNames = folders
          .filter((folder) => !folder.readOnly && (folder.parentFolderId || null) === targetParentId)
          .map((folder) => folder.name);
        const name = buildUniqueFolderName("New folder", siblingNames);
        await apiCreateFolder({
          name,
          ...(parentFolderId ? { parentFolderId } : {}),
        });
        toast.success(`Folder created: ${name}`);
        await wsData.reloadActive();
        refreshUsage();
      } catch (err) {
        toast.error(err?.message || "Couldn't create the folder");
      }
    },
    [folders, online, notifyBackendRequired, wsData, refreshUsage],
  );

  const restoreTrashItem = useCallback(
    async (item) => {
      if (!online) return notifyBackendRequired("Restore");
      try {
        if (item.kind === "folder") await apiRestoreFolder(item.id);
        else await apiRestoreDocument(item.id);
        toast.success("Restored from Trash");
        wsData.reloadTrash();
        wsData.reloadActive();
        refreshUsage();
      } catch {
        toast.error("Couldn't restore the item");
      }
    },
    [online, notifyBackendRequired, wsData, refreshUsage],
  );

  const removeChat = useCallback(
    async (id) => {
      try {
        const res = await chats.removeChat(id);
        if (res?.usage) applyUsageSnapshot(res.usage);
        toast.success("Chat removed");
      } catch {
        toast.error("Couldn't remove the chat");
      }
    },
    [applyUsageSnapshot, chats],
  );

  // --- management actions (rename / move / archive / clear; online-only) ---
  const renameFolder = useCallback(
    async (folder, name) => {
      if (folder.readOnly) return;
      if (!online) return notifyOffline();
      setOperation({ kind: "rename", status: "processing", label: `Renaming ${folder.name}` });
      try {
        await apiRenameFolder(folder.id, { name });
        wsData.reloadActive();
        setOperation({ kind: "rename", status: "complete", label: "Folder renamed" });
        toast.success("Folder renamed");
      } catch (err) {
        setOperation({ kind: "rename", status: "failed", label: "Rename failed" });
        toast.error(err?.message || "Couldn't rename the folder");
      }
    },
    [online, notifyBackendRequired, wsData],
  );

  const moveDocument = useCallback(
    async (doc, folderId) => {
      if (doc.readOnly) return;
      if (!online) return notifyOffline();
      setOperation({ kind: "move", status: "processing", label: `Moving ${doc.title}` });
      try {
        const res = await apiMoveDocument(doc.id, { folderId: folderId || null });
        if (res?.document) wsData.applyDocument(normalizeDocument(res.document));
        wsData.reloadActive();
        setOperation({ kind: "move", status: "complete", label: "Document moved" });
        toast.success("Document moved");
      } catch (err) {
        setOperation({ kind: "move", status: "failed", label: "Move failed" });
        toast.error(err?.message || "Couldn't move the document");
      }
    },
    [online, notifyBackendRequired, wsData],
  );

  const renameChat = useCallback(
    async (id, title) => {
      setOperation({ kind: "rename", status: "processing", label: "Renaming chat" });
      try {
        await chats.renameChat(id, title);
        setOperation({ kind: "rename", status: "complete", label: "Chat renamed" });
        toast.success("Chat renamed");
      } catch (err) {
        setOperation({ kind: "rename", status: "failed", label: "Rename failed" });
        toast.error(err?.message || "Couldn't rename the chat");
      }
    },
    [chats],
  );

  const archiveChat = useCallback(
    async (id) => {
      setOperation({ kind: "archive", status: "processing", label: "Archiving chat" });
      try {
        await chats.archiveChat(id); // local chats archive locally; saved chats hit the backend
        setOperation({ kind: "archive", status: "complete", label: "Chat archived" });
        toast.success("Chat archived");
      } catch (err) {
        setOperation({ kind: "archive", status: "failed", label: "Archive failed" });
        toast.error(err?.message || "Couldn't archive the chat");
      }
    },
    [chats],
  );

  const clearSession = useCallback(async () => {
    if (!online) return;
    setOperation({ kind: "clear", status: "processing", label: "Clearing session" });
    try {
      const result = await clearDemoSession();
      const usageReset = result?.clearPolicy?.usageReset !== false;
      if (usageReset) clearDemoSessionId();
      selection.setFromChat(null); // clear without persisting to the old chat
      setPreviewDocId(null);
      setActiveTab("chat");
      search.clearSearch();
      generate.clearGeneratedResult();
      generate.closeGenerateModal();
      setUsageOverride(usageReset ? null : normalizeUsage(result?.session));
      setOperation({ kind: "clear", status: "complete", label: "Session cleared" });
      toast.success(
        usageReset
          ? "Session cleared — your demo data was reset"
          : "Workspace cleared. Demo usage is preserved for this quota period.",
      );
      navigate("/", { replace: true });
    } catch {
      setOperation({ kind: "clear", status: "failed", label: "Clear failed" });
      toast.error("Couldn't clear the session");
    }
  }, [online, selection, search, generate, navigate]);

  // --- dialog requests (compact confirm / rename / move) ---
  const confirmAction = useCallback((cfg) => setDialog({ type: "confirm", ...cfg }), []);
  const requestRename = useCallback((payload) => setDialog({ type: "rename", ...payload }), []);
  const requestMove = useCallback((doc) => setDialog({ type: "move", doc }), []);

  const requestClearSession = useCallback(() => {
    if (!online) return;
    confirmAction({ ...CLEAR_SESSION_DIALOG, tone: "destructive", onConfirm: clearSession });
  }, [online, confirmAction, clearSession]);

  const requestDeleteDocument = useCallback(
    (doc) => {
      if (doc.readOnly) return;
      if (!online) return notifyOffline();
      confirmAction({ ...DELETE_CONFIRM.document(doc.title), tone: "destructive", onConfirm: () => deleteDocument(doc) });
    },
    [online, notifyOffline, confirmAction, deleteDocument],
  );

  const requestDeleteFolder = useCallback(
    (folder) => {
      if (folder.readOnly) return;
      if (!online) return notifyOffline();
      confirmAction({ ...DELETE_CONFIRM.folder(folder.name), tone: "destructive", onConfirm: () => deleteFolder(folder) });
    },
    [online, notifyOffline, confirmAction, deleteFolder],
  );

  const requestDeleteChat = useCallback(
    (chat) => {
      confirmAction({ ...DELETE_CONFIRM.chat(chat.title), tone: "destructive", onConfirm: () => removeChat(chat.id) });
    },
    [confirmAction, removeChat],
  );

  // --- derived selection ---
  const selectedFolders = useMemo(
    () => selection.folderIds.map(getFolderById).filter(Boolean),
    [selection.folderIds, getFolderById],
  );
  const selectedDocs = useMemo(
    () => selection.docIds.map(getDocById).filter(Boolean),
    [selection.docIds, getDocById],
  );
  // Selecting a folder cascades to all descendant folders (display + context).
  const effectiveFolderIds = useMemo(() => {
    const set = new Set(selection.folderIds);
    const walk = (id) => {
      (folderChildren.get(id) || []).forEach((child) => {
        if (!set.has(child.id)) {
          set.add(child.id);
          walk(child.id);
        }
      });
    };
    selection.folderIds.forEach(walk);
    return set;
  }, [selection.folderIds, folderChildren]);

  // All documents in context: directly selected + those inside (effectively) selected folders.
  const contextDocIds = useMemo(() => {
    const set = new Set(selection.docIds);
    documents.forEach((d) => {
      if (effectiveFolderIds.has(d.folderId)) set.add(d.id);
    });
    return Array.from(set);
  }, [selection.docIds, effectiveFolderIds, documents]);

  // Display-level selection: true when ticked directly OR included via a selected folder.
  const isEffectivelySelected = useCallback(
    (kind, id) => {
      if (kind === "folder") return effectiveFolderIds.has(id);
      if (selection.docIds.includes(id)) return true;
      const doc = documents.find((d) => d.id === id);
      return doc ? effectiveFolderIds.has(doc.folderId) : false;
    },
    [effectiveFolderIds, selection.docIds, documents],
  );

  const isPartiallySelectedFolder = useCallback(
    (folderId) => {
      if (effectiveFolderIds.has(folderId)) return false;
      const folderIds = new Set([folderId, ...getDescendantFolderIds(folderId)]);
      if (selection.folderIds.some((id) => folderIds.has(id) && id !== folderId)) return true;
      return documents.some((doc) => folderIds.has(doc.folderId) && selection.docIds.includes(doc.id));
    },
    [documents, effectiveFolderIds, getDescendantFolderIds, selection.docIds, selection.folderIds],
  );

  const counts = useMemo(
    () => ({
      folders: selection.folderIds.length,
      documents: selection.docIds.length,
      contextDocs: contextDocIds.length,
    }),
    [selection.folderIds, selection.docIds, contextDocIds],
  );

  const hasContext = counts.folders > 0 || counts.documents > 0;

  const askSuggestedQuestion = useCallback(
    (question) => {
      const prompt = typeof question === "string" ? question : question?.text;
      if (prompt) chat.prefillDraftFromSearch(prompt);

      const targetIds = new Set((question?.documentIds || []).filter(Boolean));
      const targetTitles = new Set(
        (question?.documentTitles || [])
          .map((title) => String(title || "").trim().toLowerCase())
          .filter(Boolean),
      );

      const associatedDocIds = documents
        .filter((doc) => {
          const title = String(doc.title || "").trim().toLowerCase();
          return (
            doc.attachable !== false &&
            (targetIds.has(doc.id) || targetTitles.has(title))
          );
        })
        .map((doc) => doc.id);

      if (associatedDocIds.length > 0) {
        const next = normalizeSelectionForHierarchy({
          selectedDocumentIds: associatedDocIds,
          selectedFolderIds: [],
        });
        if (canApplyContextSelection(next)) {
          selection.setFromChat(next);
          persistSelection(next.selectedDocumentIds, next.selectedFolderIds);
        }
      }

      setActiveTab("chat");
    },
    [
      canApplyContextSelection,
      chat,
      documents,
      normalizeSelectionForHierarchy,
      persistSelection,
      selection,
    ],
  );

  const displayUsage = useMemo(() => {
    const base = usageOverride ?? demo.usage;
    if (!online) return base;
    const liveChats = chats.chats.filter((chatItem) => !chatItem.local).length;
    const liveFolders = folders.filter((folder) => folder.group === "user" && !folder.readOnly).length;
    const liveUploads = documents.filter((doc) => doc.source === SOURCE_KIND.uploaded).length;
    const liveGenerated = documents.filter((doc) => doc.source === SOURCE_KIND.generated).length;
    return {
      ...base,
      chats: { ...base.chats, used: liveChats },
      folders: { ...base.folders, used: Math.max(base.folders.used, liveFolders) },
      uploads: { ...base.uploads, used: Math.max(base.uploads.used, liveUploads) },
      generated: { ...base.generated, used: Math.max(base.generated.used, liveGenerated) },
    };
  }, [chats.chats, demo.usage, documents, folders, online, usageOverride]);

  const ws = {
    data: {
      folders,
      documents,
      generated: wsData.generated,
      trash: wsData.trash,
      usage: displayUsage,
    },
    online,
    backendStatus: demo.backendStatus,
    operation,
    loading: { sources: wsData.loading, chats: chats.loading },
    error: { sources: wsData.error, chats: chats.error },
    reloadSources: wsData.reloadActive,
    reloadTrash: wsData.reloadTrash,

    selection: { folderIds: selection.folderIds, docIds: selection.docIds },
    isSelected: selection.isSelected,
    attach,
    detach,
    clearSelection,
    selectedFolders,
    selectedDocs,
    contextDocIds,
    folderChildren,
    effectiveFolderIds,
    isEffectivelySelected,
    isPartiallySelectedFolder,
    counts,
    hasContext,

    activeTab,
    setActiveTab,

    chats: chats.chats,
    activeChat: chats.activeChat,
    activeChatId: chats.activeChatId,
    setActiveChat,
    newChat,
    removeChat,

    sourceFilter,
    setSourceFilter,

    search,
    chat,
    askSuggestedQuestion,
    generate,

    previewDocId,
    openPreview,
    getDocById,
    getFolderById,

    // source actions
    createFolder,
    deleteDocument,
    deleteFolder,
    downloadDocument,
    restoreTrashItem,
    uploadDocument,
    retryDocument,

    // management actions (Phase 7G)
    renameFolder,
    moveDocument,
    renameChat,
    archiveChat,
    requestClearSession,
    requestRename,
    requestMove,
    requestDeleteDocument,
    requestDeleteFolder,
    requestDeleteChat,
    confirmAction,

    openGenerateModal: generate.openGenerateModal,
    notifyBackendRequired,
  };

  // Move-to-folder options: user folders only (mock excluded), + root when foldered.
  const moveDoc = dialog?.type === "move" ? dialog.doc : null;
  const moveOptions = [
    ...(moveDoc?.folderId ? [{ id: null, label: "No folder (root)" }] : []),
    ...folders
      .filter((f) => f.group === "user" && !f.readOnly)
      .map((f) => ({
        id: f.id,
        label: moveDoc && moveDoc.folderId === f.id ? `${f.name} (current)` : f.name,
        disabled: moveDoc ? moveDoc.folderId === f.id : false,
      })),
  ];

  if (demo.needsLaunch) return null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <WorkspaceTopBar
        ws={ws}
        onToggleSources={() => setSourcesDrawer((v) => !v)}
        onToggleContext={() => setContextDrawer((v) => !v)}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)_300px]">
        <SourceSidebar ws={ws} className="hidden md:flex" />
        <MainWorkspacePanel ws={ws} />
        <RightContextPanel ws={ws} className="hidden xl:flex" />
      </div>

      {/* Sources drawer (below md) */}
      <Drawer open={sourcesDrawer} side="left" onClose={() => setSourcesDrawer(false)} label="Sources">
        <SourceSidebar ws={ws} className="flex w-full border-0" />
      </Drawer>

      {/* Context drawer (below xl) */}
      <Drawer open={contextDrawer} side="right" onClose={() => setContextDrawer(false)} label="Context">
        <RightContextPanel ws={ws} className="flex w-full border-0" />
      </Drawer>

      <GenerateDocumentModalShell
        ws={ws}
        open={generate.modalOpen}
        onOpenChange={(v) => (v ? generate.setModalOpen(true) : generate.closeGenerateModal())}
      />

      {/* Compact management dialogs (confirm / rename / move) */}
      <ConfirmDialog
        open={dialog?.type === "confirm"}
        onOpenChange={(v) => !v && setDialog(null)}
        title={dialog?.title}
        description={dialog?.description}
        confirmLabel={dialog?.confirmLabel}
        tone={dialog?.tone}
        onConfirm={dialog?.onConfirm}
      />
      <PromptDialog
        open={dialog?.type === "rename"}
        onOpenChange={(v) => !v && setDialog(null)}
        title={dialog?.kind === "folder" ? "Rename folder" : "Rename chat"}
        label="Name"
        defaultValue={dialog?.title || ""}
        confirmLabel="Rename"
        onConfirm={(value) =>
          dialog?.kind === "folder" ? renameFolder(dialog.folder, value) : renameChat(dialog.target, value)
        }
      />
      <ChoiceDialog
        open={dialog?.type === "move"}
        onOpenChange={(v) => !v && setDialog(null)}
        title="Move to folder"
        description={moveDoc ? `Move "${moveDoc.title}" to one of your folders.` : undefined}
        options={moveOptions}
        emptyText="Create a folder in your workspace first."
        onSelect={(folderId) => moveDoc && moveDocument(moveDoc, folderId)}
      />
    </div>
  );
}

/** Slide-in drawer used for sources/context on smaller screens. */
function Drawer({ open, side, onClose, label, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex">
      <div
        className={cn("absolute inset-0 bg-foreground/40 backdrop-blur-[2px]", side === "right" && "order-2")}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-label={label}
        className={cn(
          "relative z-10 flex h-full w-[88%] max-w-sm flex-col bg-sidebar shadow-xl",
          side === "right" ? "ml-auto" : "mr-auto",
        )}
      >
        {children}
      </div>
    </div>
  );
}
