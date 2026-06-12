import { useCallback, useEffect, useRef, useState } from "react";
import { createChat, deleteChat, getChat, listChats, updateChat } from "@/services/chatApi";
import { isLocalChatId, normalizeChat } from "./workspaceData";

function selectionFromChat(chat) {
  return {
    selectedDocumentIds: chat?.selectedDocumentIds || [],
    selectedFolderIds: chat?.selectedFolderIds || [],
    resolvedDocumentCount: chat?.resolvedDocumentCount,
  };
}

const CHAT_TITLE_MAX_LENGTH = 120;

function buildUniqueChatTitle(baseTitle = "New chat", existingChats = [], { excludeChatId = null } = {}) {
  const base = String(baseTitle || "New chat").trim() || "New chat";
  const excluded = excludeChatId ? String(excludeChatId) : null;
  const existing = new Set(
    existingChats
      .filter((chat) => !excluded || String(chat.id) !== excluded)
      .map((chat) => String(chat.title || "").trim().toLowerCase())
      .filter(Boolean),
  );

  if (!existing.has(base.toLowerCase())) return base;

  for (let index = 2; index <= existing.size + 2; index += 1) {
    const suffix = ` (${index})`;
    const candidate = `${base.slice(0, CHAT_TITLE_MAX_LENGTH - suffix.length).trimEnd()}${suffix}`;
    if (!existing.has(candidate.toLowerCase())) return candidate;
  }

  const suffix = ` (${Date.now()})`;
  return `${base.slice(0, CHAT_TITLE_MAX_LENGTH - suffix.length).trimEnd()}${suffix}`;
}

/**
 * Chat session list + active chat. Backend-driven when online, local temporary
 * chats when offline. Exposes the active chat's persisted selection so the
 * workspace can hydrate the selected context.
 */
export function useChatSessions({ online }) {
  const [chats, setChats] = useState(() => []);
  const [activeChatId, setActiveChatId] = useState(null);
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
      setChats([]);
      setActiveChatId(null);
      setActiveSelection(null);
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
      if (mounted.current) {
        setError(err);
        setChats([]);
        setActiveChatId(null);
        setActiveSelection(null);
      }
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

  const newChat = useCallback(async ({ selectedDocumentIds = [], selectedFolderIds = [] } = {}) => {
    const title = buildUniqueChatTitle("New chat", chatsRef.current);
    if (online) {
      try {
        const res = await createChat({ title, selectedDocumentIds, selectedFolderIds });
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
      title: online ? buildUniqueChatTitle("Unsaved chat", chatsRef.current) : title,
      contextCount: selectedDocumentIds.length + selectedFolderIds.length,
      docCount: selectedDocumentIds.length,
      folderCount: selectedFolderIds.length,
      messageCount: 0,
      selectedDocumentIds,
      selectedFolderIds,
      local: true,
    };
    setChats((prev) => [localChat, ...prev]);
    setActiveChatId(localChat.id);
    return localChat;
  }, [online]);

  const removeChat = useCallback(
    async (id) => {
      let response = null;
      if (online && !isLocalChatId(id)) {
        response = await deleteChat(id);
      }
      setChats((prev) => prev.filter((c) => c.id !== id));
      setActiveChatId((prev) => (prev === id ? chatsRef.current.find((c) => c.id !== id)?.id || null : prev));
      return response;
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
      const previous = next[idx];
      next[idx] = {
        ...previous,
        ...chat,
        selectedDocumentIds:
          chat.selectedDocumentIds?.length || !previous.selectedDocumentIds?.length
            ? chat.selectedDocumentIds || []
            : previous.selectedDocumentIds,
        selectedFolderIds:
          chat.selectedFolderIds?.length || !previous.selectedFolderIds?.length
            ? chat.selectedFolderIds || []
            : previous.selectedFolderIds,
      };
      return next;
    });
  }, []);

  // Rename a chat (backend when online + saved; local otherwise).
  const renameChat = useCallback(
    async (id, title) => {
      const name = buildUniqueChatTitle(title, chatsRef.current, { excludeChatId: id });
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
