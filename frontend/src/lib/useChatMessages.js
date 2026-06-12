import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getChat, sendChatMessage } from "@/services/chatApi";
import { isLocalChatId, normalizeAnswerReferences, normalizeChatMessage } from "./workspaceData";
import { DEMO_LIMITS } from "./constants";

const PENDING_STEPS = ["Resolving context", "Retrieving references", "Generating answer", "Saving response"];
const PENDING_CHAT_KEY_PREFIX = "centraldocs.pendingChat.";

function createOptimisticUserMessage({ id, content, createdAt }) {
  return {
    id,
    role: "user",
    content,
    status: "sending",
    createdAt: createdAt || new Date().toISOString(),
    contextDocs: [],
    attachedFolderNames: [],
    references: [],
    aiMeta: null,
    optimistic: true,
  };
}

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
  onUsageSnapshot,
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
    ref.current = { online, activeChatId, selectedDocumentIds, selectedFolderIds, onChatUpdated, onPromptUsage, onUsageSnapshot, draft };
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

  const pendingKey = (chatId) => `${PENDING_CHAT_KEY_PREFIX}${chatId}`;

  const readPending = (chatId) => {
    try {
      const raw = sessionStorage.getItem(pendingKey(chatId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const writePending = (chatId, content) => {
    try {
      sessionStorage.setItem(
        pendingKey(chatId),
        JSON.stringify({ content, startedAt: new Date().toISOString() }),
      );
    } catch {
      /* ignore */
    }
  };

  const clearPending = (chatId) => {
    try {
      sessionStorage.removeItem(pendingKey(chatId));
    } catch {
      /* ignore */
    }
  };

  const loadMessagesForChat = useCallback(async (chatId) => {
    const { online: on } = ref.current;
    if (!chatId || !on || isLocalChatId(chatId)) {
      setMessages([]);
      setSelectedAssistantMessageId(null);
      return;
    }
    setIsLoadingMessages(true);
    try {
      const res = await getChat(chatId);
      if (!mounted.current) return;
      let list = (res.messages || []).map(normalizeChatMessage);
      const pending = readPending(chatId);
      if (pending) {
        const pendingUserIndex = list.findLastIndex?.(
          (message) => message.role === "user" && message.content === pending.content,
        ) ?? -1;
        const hasAssistantAfterPending =
          pendingUserIndex >= 0 && list.slice(pendingUserIndex + 1).some((message) => message.role === "assistant");
        if (hasAssistantAfterPending) {
          clearPending(chatId);
          setIsSending(false);
          setPendingStep(null);
        } else {
          if (pendingUserIndex < 0) {
            list = [
              ...list,
              createOptimisticUserMessage({
                id: `pending-user-${chatId}`,
                content: pending.content,
                createdAt: pending.startedAt,
              }),
            ];
          }
          setIsSending(true);
          setPendingStep("Generating answer");
          window.setTimeout(() => {
            if (mounted.current && ref.current.activeChatId === chatId) {
              loadMessagesForChat(chatId);
            }
          }, 5000);
        }
      }
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
      const normalizedAnswer = normalizeAnswerReferences({
        content: assistant.content,
        references: res.references,
      });
      assistant.content = normalizedAnswer.content;
      assistant.references = normalizedAnswer.references;
    }
    setMessages((prev) => {
      const withoutOptimisticUser = user
        ? prev.filter(
          (message) =>
            !(
              message.optimistic &&
              message.role === "user" &&
              message.content === user.content
            ),
        )
        : prev;
      return [...withoutOptimisticUser, user, assistant].filter(Boolean);
    });
    if (assistant) setSelectedAssistantMessageId(assistant.id);
    const { onChatUpdated: onChat, onPromptUsage: onUsage } = ref.current;
    if (res?.chat && onChat) onChat(res.chat);
    if (res?.usage && res.usage.aiPrompts != null && onUsage) onUsage(res.usage.aiPrompts);
    if (res?.usage && ref.current.onUsageSnapshot) ref.current.onUsageSnapshot(res.usage);
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
    const optimisticId = `pending-user-${chatId}-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      createOptimisticUserMessage({ id: optimisticId, content }),
    ]);
    writePending(chatId, content);
    startStepCycler();
    try {
      const res = await sendChatMessage(chatId, {
        content,
        selectedDocumentIds: docIds,
        selectedFolderIds: folderIds,
      });
      if (!mounted.current) return;
      clearPending(chatId);
      applyChatResponse(res);
      setDraft(""); // clear only on success
    } catch (err) {
      clearPending(chatId);
      if (mounted.current) {
        setSendError(err);
        setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
        await loadMessagesForChat(chatId);
      }
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
