import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { SOURCE_FILTER } from "@/lib/constants";
import { useBackendStatus } from "@/lib/useBackendStatus";
import {
  FALLBACK_CHATS,
  FALLBACK_DOCUMENTS,
  FALLBACK_FOLDERS,
  FALLBACK_GENERATED,
  FALLBACK_TRASH,
  FALLBACK_USAGE,
} from "@/data/mockWorkspaceFallback";
import { WorkspaceTopBar } from "./WorkspaceTopBar";
import { SourceSidebar } from "./SourceSidebar";
import { MainWorkspacePanel } from "./MainWorkspacePanel";
import { RightContextPanel } from "./RightContextPanel";
import { GenerateDocumentModalShell } from "./GenerateDocumentModalShell";

/**
 * One compact workspace route. Holds Phase 7A shell state (selected source
 * context, active chat/tab, filters) so the plus/minus/delete interactions are
 * visible immediately. Backend wiring is deferred; data comes from the offline
 * fallback and the workspace stays usable when the backend is cold.
 */
export default function CentralDocsWorkspace() {
  const { status: backendStatus, check } = useBackendStatus({ auto: true });

  // Static fallback data for the foundation phase.
  const folders = FALLBACK_FOLDERS;
  const documents = FALLBACK_DOCUMENTS;
  const generated = FALLBACK_GENERATED;
  const trash = FALLBACK_TRASH;
  const usage = FALLBACK_USAGE;

  const [chats, setChats] = useState(FALLBACK_CHATS);
  const [activeChatId, setActiveChatId] = useState(
    () => (FALLBACK_CHATS.find((c) => c.active) || FALLBACK_CHATS[0])?.id,
  );
  const [activeTab, setActiveTab] = useState("chat");
  const [sourceFilter, setSourceFilter] = useState(SOURCE_FILTER.active);

  const [selectedFolderIds, setSelectedFolderIds] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);

  const [previewDocId, setPreviewDocId] = useState(null);
  const [generateOpen, setGenerateOpen] = useState(false);

  // Mobile/medium drawers
  const [sourcesDrawer, setSourcesDrawer] = useState(false);
  const [contextDrawer, setContextDrawer] = useState(false);

  const getDocById = useCallback((id) => documents.find((d) => d.id === id) || null, [documents]);
  const getFolderById = useCallback((id) => folders.find((f) => f.id === id) || null, [folders]);

  const isSelected = useCallback(
    (kind, id) =>
      kind === "folder" ? selectedFolderIds.includes(id) : selectedDocIds.includes(id),
    [selectedFolderIds, selectedDocIds],
  );

  const attach = useCallback(
    (kind, id) => {
      if (kind === "folder") {
        setSelectedFolderIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        toast.success(`Attached folder to chat context`);
      } else {
        setSelectedDocIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        toast.success(`Attached document to chat context`);
      }
    },
    [],
  );

  const detach = useCallback((kind, id) => {
    if (kind === "folder") setSelectedFolderIds((prev) => prev.filter((x) => x !== id));
    else setSelectedDocIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFolderIds([]);
    setSelectedDocIds([]);
  }, []);

  const openPreview = useCallback((id) => {
    setPreviewDocId(id);
    setActiveTab("preview");
  }, []);

  const setActiveChat = useCallback((id) => {
    setActiveChatId(id);
    setChats((prev) => prev.map((c) => ({ ...c, active: c.id === id })));
    setActiveTab("chat");
  }, []);

  const newChat = useCallback(() => {
    const id = `chat-${Date.now()}`;
    const chat = { id, title: "New chat", contextCount: 0, active: true };
    setChats((prev) => [chat, ...prev.map((c) => ({ ...c, active: false }))]);
    setActiveChatId(id);
    setActiveTab("chat");
  }, []);

  const notifyDeferred = useCallback((action = "This action") => {
    toast(`${action} is not wired yet`, {
      description: "Backend wiring comes in a later frontend phase.",
    });
  }, []);

  // Derived selection
  const selectedFolders = useMemo(
    () => selectedFolderIds.map(getFolderById).filter(Boolean),
    [selectedFolderIds, getFolderById],
  );
  const selectedDocs = useMemo(
    () => selectedDocIds.map(getDocById).filter(Boolean),
    [selectedDocIds, getDocById],
  );
  const resolvedDocIds = useMemo(() => {
    const set = new Set(selectedDocIds);
    documents.forEach((d) => {
      if (selectedFolderIds.includes(d.folderId)) set.add(d.id);
    });
    return Array.from(set);
  }, [selectedDocIds, selectedFolderIds, documents]);

  const counts = useMemo(
    () => ({
      folders: selectedFolderIds.length,
      documents: selectedDocIds.length,
      resolved: resolvedDocIds.length,
    }),
    [selectedFolderIds, selectedDocIds, resolvedDocIds],
  );

  const activeChat = chats.find((c) => c.id === activeChatId) || null;
  const hasContext = counts.folders > 0 || counts.documents > 0;

  const ws = {
    data: { folders, documents, generated, trash, usage },
    backendStatus,
    recheckBackend: check,
    selection: { folderIds: selectedFolderIds, docIds: selectedDocIds },
    isSelected,
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
    chats,
    activeChat,
    activeChatId,
    setActiveChat,
    newChat,
    sourceFilter,
    setSourceFilter,
    previewDocId,
    openPreview,
    getDocById,
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
