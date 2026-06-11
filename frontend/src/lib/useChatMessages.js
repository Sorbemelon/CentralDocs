import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getChat, sendChatMessage } from "@/services/chatApi";
import { isLocalChatId, normalizeChatMessage, normalizeReference } from "./workspaceData";
import { DEMO_LIMITS } from "./constants";
import { FALLBACK_CHAT_MESSAGES } from "@/data/demoCopy";

const PENDING_STEPS = ["Resolving context", "Retrieving references", "Generating answer", "Saving response"];

/**
 * Chat message state for the active chat. Loads saved messages from getChat and
 * sends prompts to POST /chats/:id/messages using the current selected context.
 * Online/selection/callbacks are read from a ref so the send/load stay stable.
 */
export function useChatMessages({
  online,
  activeChatId,
  selectedDocumentIds = [],
  selectedFolderIds = [],
  onChatUpdated,
  onPromptUsage,
}) {
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [selectedAssistantMessageId, setSelectedAssistantMessageId] = useState(null);
  const [draft, setDraft] = useState("");
  const [pendingStep, setPendingStep] = useState(null);

  const ref = useRef({});
  useEffect(() => {
    ref.current = { online, activeChatId, selectedDocumentIds, selectedFolderIds, onChatUpdated, onPromptUsage, draft };
  });

  const mounted = useRef(true);
  const stepTimer = useRef(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (stepTimer.current) clearInterval(stepTimer.current);
    };
  }, []);

  const latestAssistantId = (list) => {
    for (let i = list.length - 1; i >= 0; i -= 1) {
      if (list[i].role === "assistant") return list[i].id;
    }
    return null;
  };

  const loadMessagesForChat = useCallback(async (chatId) => {
    const { online: on } = ref.current;
    if (!chatId || !on || isLocalChatId(chatId)) {
      setMessages(FALLBACK_CHAT_MESSAGES);
      setSelectedAssistantMessageId(null);
      return;
    }
    setIsLoadingMessages(true);
    try {
      const res = await getChat(chatId);
      if (!mounted.current) return;
      const list = (res.messages || []).map(normalizeChatMessage);
      setMessages(list);
      setSelectedAssistantMessageId(latestAssistantId(list));
    } catch {
      if (mounted.current) setMessages([]); // compact empty state; no crash
    } finally {
      if (mounted.current) setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadMessagesForChat(activeChatId);
  }, [activeChatId, online, loadMessagesForChat]);

  const applyChatResponse = useCallback((res) => {
    const user = res?.userMessage ? normalizeChatMessage(res.userMessage) : null;
    const assistant = res?.assistantMessage ? normalizeChatMessage(res.assistantMessage) : null;
    if (assistant && !assistant.references.length && Array.isArray(res?.references) && res.references.length) {
      assistant.references = res.references.map(normalizeReference);
    }
    setMessages((prev) => [...prev, user, assistant].filter(Boolean));
    if (assistant) setSelectedAssistantMessageId(assistant.id);
    const { onChatUpdated: onChat, onPromptUsage: onUsage } = ref.current;
    if (res?.chat && onChat) onChat(res.chat);
    if (res?.usage && res.usage.aiPrompts != null && onUsage) onUsage(res.usage.aiPrompts);
  }, []);

  const startStepCycler = () => {
    let i = 0;
    setPendingStep(PENDING_STEPS[0]);
    stepTimer.current = setInterval(() => {
      i = Math.min(i + 1, 2); // hold at "Generating answer" during the wait
      setPendingStep(PENDING_STEPS[i]);
    }, 700);
  };
  const stopStepCycler = () => {
    if (stepTimer.current) {
      clearInterval(stepTimer.current);
      stepTimer.current = null;
    }
    setPendingStep(null);
  };

  const sendMessage = useCallback(async () => {
    const {
      online: on,
      activeChatId: chatId,
      selectedDocumentIds: docIds,
      selectedFolderIds: folderIds,
      draft: text,
    } = ref.current;
    const content = String(text || "").trim();

    if (!content) return;
    if (content.length > DEMO_LIMITS.promptLength) {
      toast.error(`Prompt is too long (max ${DEMO_LIMITS.promptLength.toLocaleString()} characters).`);
      return;
    }
    if (!on) {
      toast.error("Backend is offline. Sending requires the backend.");
      return;
    }
    if (!chatId || isLocalChatId(chatId)) {
      toast.error("Start or select a saved chat to send a message.");
      return;
    }
    if (!docIds.length && !folderIds.length) {
      toast("Select a document or folder first.");
      return;
    }

    setIsSending(true);
    setSendError(null);
    startStepCycler();
    try {
      const res = await sendChatMessage(chatId, {
        content,
        selectedDocumentIds: docIds,
        selectedFolderIds: folderIds,
      });
      if (!mounted.current) return;
      applyChatResponse(res);
      setDraft(""); // clear only on success
    } catch (err) {
      if (mounted.current) setSendError(err);
      toast.error(err?.message || "Couldn't generate an answer. Your prompt was kept.");
    } finally {
      if (mounted.current) {
        stopStepCycler();
        setIsSending(false);
      }
    }
  }, [applyChatResponse]);

  const selectAssistantMessage = useCallback((id) => setSelectedAssistantMessageId(id), []);
  const clearDraft = useCallback(() => setDraft(""), []);
  const prefillDraftFromSearch = useCallback((query) => setDraft(String(query || "")), []);

  const activeReferences = useMemo(() => {
    if (!messages.length) return [];
    const byId = selectedAssistantMessageId
      ? messages.find((m) => m.id === selectedAssistantMessageId && m.role === "assistant")
      : null;
    const target = byId || [...messages].reverse().find((m) => m.role === "assistant");
    return target?.references || [];
  }, [messages, selectedAssistantMessageId]);

  return {
    messages,
    isLoadingMessages,
    isSending,
    sendError,
    selectedAssistantMessageId,
    draft,
    pendingStep,
    activeReferences,
    loadMessagesForChat,
    setDraft,
    sendMessage,
    selectAssistantMessage,
    applyChatResponse,
    clearDraft,
    prefillDraftFromSearch,
  };
}
