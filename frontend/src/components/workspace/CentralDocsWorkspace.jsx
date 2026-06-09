import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { SOURCE_FILTER, SOURCE_KIND } from "@/lib/constants";
import { isLocalChatId } from "@/lib/workspaceData";
import { useDemoSession } from "@/lib/useDemoSession";
import { useWorkspaceData } from "@/lib/useWorkspaceData";
import { useChatSessions } from "@/lib/useChatSessions";
import { useSelectedContext } from "@/lib/useSelectedContext";
import { updateChatSelection } from "@/services/chatApi";
import {
  createDownloadUrl,
  deleteDocument as apiDeleteDocument,
  restoreDocument as apiRestoreDocument,
} from "@/services/documentApi";
import {
  createFolder as apiCreateFolder,
  deleteFolder as apiDeleteFolder,
  restoreFolder as apiRestoreFolder,
} from "@/services/folderApi";
import { WorkspaceTopBar } from "./WorkspaceTopBar";
import { SourceSidebar } from "./SourceSidebar";
import { MainWorkspacePanel } from "./MainWorkspacePanel";
import { RightContextPanel } from "./RightContextPanel";
import { GenerateDocumentModalShell } from "./GenerateDocumentModalShell";

/**
 * One compact workspace route. Phase 7B wires Sources + Chat Sessions to the
 * backend (folders/documents/trash/chats + demo session/bootstrap) and persists
 * the selected context onto the active chat, while degrading gracefully to the
 * offline fallback. Upload/search/chat-send/generate remain deferred shells.
 */
export default function CentralDocsWorkspace() {
  const demo = useDemoSession();
  const online = demo.online;

  const [activeTab, setActiveTab] = useState("chat");
  const [sourceFilter, setSourceFilter] = useState(SOURCE_FILTER.active);
  const [previewDocId, setPreviewDocId] = useState(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [sourcesDrawer, setSourcesDrawer] = useState(false);
  const [contextDrawer, setContextDrawer] = useState(false);

  const wsData = useWorkspaceData({ online, bootstrap: demo.bootstrap, filter: sourceFilter });
  const chats = useChatSessions({ online });

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
  const { setFromChat } = selection;

  // Hydrate selected context from the active chat's persisted selection.
  useEffect(() => {
    if (chats.activeSelection) setFromChat(chats.activeSelection);
  }, [chats.activeSelection, setFromChat]);

  const { folders, documents } = wsData;
  const getDocById = useCallback((id) => documents.find((d) => d.id === id) || null, [documents]);
  const getFolderById = useCallback((id) => folders.find((f) => f.id === id) || null, [folders]);

  // --- selection wrappers (toast + local/remote handled by the hook) ---
  const attach = useCallback(
    (kind, id) => {
      selection.attach(kind, id);
      toast.success(kind === "folder" ? "Folder attached to context" : "Document attached to context");
    },
    [selection],
  );
  const detach = selection.detach;
  const clearSelection = selection.clear;

  const notifyDeferred = useCallback((action = "This action") => {
    toast(`${action} is not wired yet`, {
      description: "This comes in a later frontend phase.",
    });
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

  // --- source actions (wired when online + reversible; toast otherwise) ---
  const deleteDocument = useCallback(
    async (doc) => {
      if (doc.readOnly) return;
      if (!online) return notifyDeferred("Delete document");
      try {
        await apiDeleteDocument(doc.id);
        selection.detach("document", doc.id);
        toast.success("Document moved to Trash");
        wsData.reloadActive();
        if (sourceFilter === SOURCE_FILTER.trash) wsData.reloadTrash();
      } catch {
        toast.error("Couldn't delete the document");
      }
    },
    [online, notifyDeferred, selection, wsData, sourceFilter],
  );

  const deleteFolder = useCallback(
    async (folder) => {
      if (folder.readOnly) return;
      if (!online) return notifyDeferred("Delete folder");
      try {
        await apiDeleteFolder(folder.id);
        selection.detach("folder", folder.id);
        toast.success("Folder moved to Trash");
        wsData.reloadActive();
      } catch {
        toast.error("Couldn't delete the folder");
      }
    },
    [online, notifyDeferred, selection, wsData],
  );

  const downloadDocument = useCallback(
    async (doc) => {
      if (!online || doc.source === SOURCE_KIND.mock) return notifyDeferred("Download");
      try {
        const res = await createDownloadUrl(doc.id);
        const url = res?.url || res?.downloadUrl || res?.download?.url;
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        else toast.success("Download link created");
      } catch {
        toast.error("Couldn't create a download link");
      }
    },
    [online, notifyDeferred],
  );

  const createFolder = useCallback(async () => {
    if (!online) return notifyDeferred("Create folder");
    try {
      await apiCreateFolder({ name: "New folder" });
      toast.success("Folder created");
      wsData.reloadActive();
    } catch {
      toast.error("Couldn't create the folder");
    }
  }, [online, notifyDeferred, wsData]);

  const restoreTrashItem = useCallback(
    async (item) => {
      if (!online) return notifyDeferred("Restore");
      try {
        if (item.kind === "folder") await apiRestoreFolder(item.id);
        else await apiRestoreDocument(item.id);
        toast.success("Restored from Trash");
        wsData.reloadTrash();
        wsData.reloadActive();
      } catch {
        toast.error("Couldn't restore the item");
      }
    },
    [online, notifyDeferred, wsData],
  );

  const removeChat = useCallback(
    async (id) => {
      try {
        await chats.removeChat(id);
        toast.success("Chat removed");
      } catch {
        toast.error("Couldn't remove the chat");
      }
    },
    [chats],
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
  const resolvedDocIds = useMemo(() => {
    const set = new Set(selection.docIds);
    documents.forEach((d) => {
      if (selection.folderIds.includes(d.folderId)) set.add(d.id);
    });
    return Array.from(set);
  }, [selection.docIds, selection.folderIds, documents]);

  const counts = useMemo(
    () => ({
      folders: selection.folderIds.length,
      documents: selection.docIds.length,
      resolved: resolvedDocIds.length,
    }),
    [selection.folderIds, selection.docIds, resolvedDocIds],
  );

  const hasContext = counts.folders > 0 || counts.documents > 0;

  const ws = {
    data: {
      folders,
      documents,
      generated: wsData.generated,
      trash: wsData.trash,
      usage: demo.usage,
    },
    online,
    backendStatus: demo.backendStatus,
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
    resolvedDocIds,
    counts,
    hasContext,

    activeTab,
    setActiveTab,

    chats: chats.chats,
    activeChat: chats.activeChat,
    activeChatId: chats.activeChatId,
    setActiveChat,
    newChat: chats.newChat,
    removeChat,

    sourceFilter,
    setSourceFilter,

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

    openGenerateModal: () => setGenerateOpen(true),
    notifyDeferred,
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
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

      <GenerateDocumentModalShell ws={ws} open={generateOpen} onOpenChange={setGenerateOpen} />
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
