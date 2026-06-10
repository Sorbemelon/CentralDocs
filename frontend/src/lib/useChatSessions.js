import { useCallback, useEffect, useRef, useState } from "react";
import { createChat, deleteChat, getChat, listChats, updateChat } from "@/services/chatApi";
import { isLocalChatId, normalizeChat } from "./workspaceData";
import { FALLBACK_CHATS } from "@/data/mockWorkspaceFallback";

function toLocalChat(c) {
  return {
    id: c.id,
    title: c.title,
    contextCount: c.contextCount ?? 0,
    docCount: c.contextCount ?? 0,
    folderCount: 0,
    messageCount: c.messageCount ?? 0,
    selectedDocumentIds: c.selectedDocumentIds || [],
    selectedFolderIds: c.selectedFolderIds || [],
    local: true,
  };
}

function selectionFromChat(chat) {
  return {
    selectedDocumentIds: chat?.selectedDocumentIds || [],
    selectedFolderIds: chat?.selectedFolderIds || [],
    resolvedDocumentCount: chat?.resolvedDocumentCount,
  };
}

/**
 * Chat session list + active chat. Backend-driven when online, local temporary
 * chats when offline. Exposes the active chat's persisted selection so the
 * workspace can hydrate the selected context.
 */
export function useChatSessions({ online }) {
  const [chats, setChats] = useState(() => FALLBACK_CHATS.map(toLocalChat));
  const [activeChatId, setActiveChatId] = useState(() => FALLBACK_CHATS[0]?.id || null);
  const [activeSelection, setActiveSelection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mounted = useRef(true);
  const chatsRef = useRef(chats);
  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!online) {
      setChats(FALLBACK_CHATS.map(toLocalChat));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await listChats();
      const list = (res.chats || []).map(normalizeChat);
      if (!mounted.current) return;
      setChats(list);
      setActiveChatId((prev) => (prev && list.some((c) => c.id === prev) ? prev : list[0]?.id || null));
    } catch (err) {
      if (mounted.current) setError(err); // keep fallback chats
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [online]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-select the first chat when none is active.
  useEffect(() => {
    if (!activeChatId && chats.length) setActiveChatId(chats[0].id);
  }, [activeChatId, chats]);

  // Hydrate the active chat's selection (backend detail when online).
  useEffect(() => {
    let cancelled = false;
    async function loadSelection() {
      if (!activeChatId) {
        setActiveSelection(null);
        return;
      }
      const chat = chatsRef.current.find((c) => c.id === activeChatId);
      if (online && !isLocalChatId(activeChatId)) {
        try {
          const res = await getChat(activeChatId);
          if (cancelled) return;
          const sel = res.selection || {};
          setActiveSelection({
            selectedDocumentIds: sel.selectedDocumentIds || res.chat?.currentSelectedDocumentIds || [],
            selectedFolderIds: sel.selectedFolderIds || res.chat?.currentSelectedFolderIds || [],
            resolvedDocumentCount: res.chat?.resolvedDocumentCount,
          });
        } catch {
          if (!cancelled) setActiveSelection(selectionFromChat(chat));
        }
      } else {
        setActiveSelection(selectionFromChat(chat));
      }
    }
    loadSelection();
    return () => {
      cancelled = true;
    };
  }, [activeChatId, online]);

  const setActiveChat = useCallback((id) => setActiveChatId(id), []);

  const newChat = useCallback(async () => {
    if (online) {
      try {
        const res = await createChat({ title: "New chat" });
        const chat = normalizeChat(res.chat);
        setChats((prev) => [chat, ...prev]);
        setActiveChatId(chat.id);
        return chat;
      } catch {
        /* fall through to a local temporary chat */
      }
    }
    const localChat = {
      id: `local-${Date.now()}`,
      title: "New chat",
      contextCount: 0,
      docCount: 0,
      folderCount: 0,
      messageCount: 0,
      selectedDocumentIds: [],
      selectedFolderIds: [],
      local: true,
    };
    setChats((prev) => [localChat, ...prev]);
    setActiveChatId(localChat.id);
    return localChat;
  }, [online]);

  const removeChat = useCallback(
    async (id) => {
      if (online && !isLocalChatId(id)) {
        await deleteChat(id);
      }
      setChats((prev) => prev.filter((c) => c.id !== id));
      setActiveChatId((prev) => (prev === id ? chatsRef.current.find((c) => c.id !== id)?.id || null : prev));
    },
    [online],
  );

  // Patch a chat in place (e.g. messageCount/lastMessageAt after sending a message).
  const applyChat = useCallback((chat) => {
    if (!chat?.id) return;
    setChats((prev) => {
      const idx = prev.findIndex((c) => c.id === chat.id);
      if (idx === -1) return prev;
      const next = prev.slice();
      next[idx] = { ...next[idx], ...chat };
      return next;
    });
  }, []);

  // Rename a chat (backend when online + saved; local otherwise).
  const renameChat = useCallback(
    async (id, title) => {
      const name = String(title || "").trim();
      if (!id || !name) return;
      if (online && !isLocalChatId(id)) {
        const res = await updateChat(id, { title: name });
        applyChat(normalizeChat(res.chat));
      } else {
        applyChat({ id, title: name });
      }
    },
    [online, applyChat],
  );

  // Archive a chat: hide it from the list (backend archive when online + saved).
  const archiveChat = useCallback(
    async (id) => {
      if (online && !isLocalChatId(id)) {
        await updateChat(id, { archived: true });
      }
      setChats((prev) => prev.filter((c) => c.id !== id));
      setActiveChatId((prev) => (prev === id ? chatsRef.current.find((c) => c.id !== id)?.id || null : prev));
    },
    [online],
  );

  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  return {
    chats,
    loading,
    error,
    activeChatId,
    activeChat,
    activeSelection,
    isLocalActiveChat: isLocalChatId(activeChatId),
    setActiveChat,
    newChat,
    removeChat,
    applyChat,
    renameChat,
    archiveChat,
    reload: load,
  };
}
