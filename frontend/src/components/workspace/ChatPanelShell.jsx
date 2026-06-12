import { useEffect, useRef, useState } from "react";
import { FileText, Folder, Loader2, MessageSquarePlus, MessagesSquare, Pencil, Quote, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/common/EmptyState";
import { IconButton } from "@/components/common/IconButton";
import { LoadingState } from "@/components/common/LoadingState";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import { cn } from "@/lib/cn";
import { DEMO_LIMITS } from "@/lib/constants";
import { CHAT_SAMPLE_QUESTIONS } from "@/data/demoCopy";

function UserMessage({ message }) {
  const docs = message.contextDocs || [];
  const folders = message.attachedFolderNames || [];
  // Group document names under their folder (folders the user selected first).
  const grouped = new Map();
  const loose = [];
  docs.forEach((d) => {
    if (d.folderName) {
      if (!grouped.has(d.folderName)) grouped.set(d.folderName, []);
      grouped.get(d.folderName).push(d.title);
    } else {
      loose.push(d.title);
    }
  });
  folders.forEach((name) => {
    if (!grouped.has(name)) grouped.set(name, []);
  });

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="max-w-[80%] whitespace-pre-wrap rounded-lg rounded-br-sm bg-teal px-3 py-2 text-sm text-teal-foreground">
        {message.content}
      </div>
      {(docs.length > 0 || folders.length > 0) && (
        <Accordion type="single" className="max-w-[80%] items-end">
          <AccordionItem value="ctx" className="flex flex-col items-end">
            <AccordionTrigger className="w-auto justify-end gap-1 text-[11px] text-muted-foreground">
              Selected documents: {docs.length}
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-0.5 rounded-md border border-border bg-card p-2 text-[12px]">
              {[...grouped.entries()].map(([folderName, titles]) => (
                <div key={folderName} className="flex flex-col gap-0.5">
                  <p className="flex items-center gap-1.5 font-medium text-foreground">
                    <Folder className="size-3 shrink-0 text-teal" />
                    <span className="min-w-0 truncate">{folderName}</span>
                  </p>
                  {titles.map((title) => (
                    <p key={title} className="ml-2.5 flex items-center gap-1.5 border-l border-border pl-2 text-foreground">
                      <FileText className="size-3 shrink-0 text-primary" />
                      <span className="min-w-0 truncate">{title}</span>
                    </p>
                  ))}
                </div>
              ))}
              {loose.map((title) => (
                <p key={title} className="flex items-center gap-1.5 text-foreground">
                  <FileText className="size-3 shrink-0 text-primary" />
                  <span className="min-w-0 truncate">{title}</span>
                </p>
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}

function LegacyAssistantMessage({ message, selected, onSelect }) {
  const refs = message.references || [];
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "max-w-[80%] rounded-lg rounded-bl-sm bg-primary px-3 py-2 text-left text-sm text-primary-foreground shadow-sm transition-colors hover:bg-primary/90",
          selected && "ring-2 ring-primary/25 ring-offset-1 ring-offset-background",
        )}
      >
        {message.content}
      </button>
      {refs.length > 0 && (
        <Accordion type="single" className="max-w-[80%]">
          <AccordionItem value="refs">
            <AccordionTrigger className="text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Quote className="size-3" /> References used: {refs.length}
              </span>
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-1 rounded-md border border-teal/25 bg-teal-subtle/40 p-2 text-[12px]">
              {refs.map((r) => (
                <div key={`${r.number}-${r.documentId}`} className="text-muted-foreground">
                  <span className="font-medium text-primary">[{r.number}]</span>{" "}
                  <span className="text-foreground">{r.title}</span>
                  {r.locator ? <span className="font-mono"> · {r.locator}</span> : null}
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}

function AnswerContent({ content, refs, onCitationClick }) {
  const refNumbers = new Set(refs.map((r) => Number(r.number)).filter((n) => Number.isFinite(n)));
  const parts = [];
  const citationPattern = /\[(\d+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = citationPattern.exec(content)) !== null) {
    const citationText = match[0];
    const citationNumber = Number(match[1]);
    if (match.index > lastIndex) parts.push(content.slice(lastIndex, match.index));
    parts.push({ citationText, citationNumber, linked: refNumbers.has(citationNumber) });
    lastIndex = match.index + citationText.length;
  }

  if (lastIndex < content.length) parts.push(content.slice(lastIndex));

  return parts.map((part, index) => {
    if (typeof part === "string") return <span key={`text-${index}`}>{part}</span>;
    if (!part.linked) return <span key={`cite-${index}`}>{part.citationText}</span>;
    return (
      <button
        key={`cite-${index}`}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCitationClick(part.citationNumber);
        }}
        className="mx-0.5 inline-flex translate-y-[-1px] rounded border border-background/80 bg-background px-1 py-0 text-[11px] font-bold leading-4 text-primary shadow-sm transition-colors hover:bg-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background"
        title={`Show reference ${part.citationNumber}`}
      >
        {part.citationNumber}
      </button>
    );
  });
}

function formatReferenceFilename(ref) {
  const title = ref.title || "Untitled";
  const ext = String(ref.fileType || "").replace(/^\./, "").toLowerCase();
  if (!ext || title.toLowerCase().endsWith(`.${ext}`)) return title;
  return `${title}.${ext}`;
}

function formatReferencePath(ref) {
  return [ref.folderName, formatReferenceFilename(ref)].filter(Boolean).join(" / ");
}

function referenceSourceKey(ref) {
  return [
    ref.documentId || "",
    ref.folderName || "",
    formatReferenceFilename(ref),
  ].join("|");
}

function groupReferencesBySource(refs = []) {
  const grouped = [];
  const bySource = new Map();
  refs.forEach((ref) => {
    const key = referenceSourceKey(ref);
    if (!bySource.has(key)) {
      const item = { ...ref, numbers: [] };
      bySource.set(key, item);
      grouped.push(item);
    }
    const number = Number(ref.number);
    if (Number.isFinite(number) && !bySource.get(key).numbers.includes(number)) {
      bySource.get(key).numbers.push(number);
    }
  });
  return grouped;
}

function AssistantMessage({ message, selected, onSelect }) {
  const refs = message.references || [];
  const sourceRefs = groupReferencesBySource(refs);
  const [refsOpen, setRefsOpen] = useState("");
  const [focusedRefNumber, setFocusedRefNumber] = useState(null);
  const refNodes = useRef(new Map());

  const focusReference = (number) => {
    setRefsOpen("refs");
    setFocusedRefNumber(number);
    window.requestAnimationFrame(() => {
      refNodes.current.get(number)?.scrollIntoView({ block: "nearest" });
    });
  };

  const onBubbleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={onBubbleKeyDown}
        className={cn(
          "max-w-[80%] rounded-lg rounded-bl-sm bg-primary px-3 py-2 text-left text-sm text-primary-foreground shadow-sm transition-colors hover:bg-primary/90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected && "ring-2 ring-primary/25 ring-offset-1 ring-offset-background",
        )}
      >
        <MarkdownContent content={message.content} references={refs} onCitationClick={focusReference} />
      </div>
      {sourceRefs.length > 0 && (
        <Accordion type="single" value={refsOpen} onValueChange={setRefsOpen} className="max-w-[80%] items-start">
          <AccordionItem value="refs" className="flex flex-col items-start">
            <AccordionTrigger className="w-auto justify-start gap-1 text-[11px] text-muted-foreground">
              References used: {sourceRefs.length}
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-0.5 py-1 text-[12px]">
              {sourceRefs.map((r) => (
                <div
                  key={`${r.documentId || formatReferencePath(r)}-${r.numbers.join("-")}`}
                  id={`assistant-ref-${message.id}-${r.numbers[0] || r.number}`}
                  ref={(node) => {
                    r.numbers.forEach((number) => {
                      if (node) refNodes.current.set(number, node);
                      else refNodes.current.delete(number);
                    });
                  }}
                  className={cn(
                    "px-1.5 py-0.5 text-muted-foreground transition-colors",
                    r.numbers.includes(focusedRefNumber) && "text-primary",
                  )}
                >
                  <div className="flex items-start gap-1.5">
                    <span className="mt-0.5 shrink-0 font-mono text-[10px] font-semibold text-primary">
                      {r.numbers.length ? r.numbers.join(",") : r.number}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-1.5 text-foreground">
                        <FileText className="size-3 shrink-0 text-primary" />
                        <span className="min-w-0 truncate">{formatReferencePath(r)}</span>
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}

function PendingAssistant({ step }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="inline-flex max-w-[80%] items-center gap-2 rounded-lg rounded-bl-sm border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> {step || "Generating answer"}…
      </div>
    </div>
  );
}

/** Chat tab — saved messages scroll above a bottom composer. */
function ChatPanelShell({ ws }) {
  const chat = ws.chat;
  const offline = !ws.online;
  const hasActiveChat = Boolean(ws.activeChat);
  const noRealChat = !ws.activeChat || ws.activeChat.local;
  const hasMessages = (chat.messages?.length || 0) > 0;
  const canGenerate = !offline && !noRealChat && hasMessages;
  const generateReason = offline
    ? "Backend is offline"
    : noRealChat
      ? "Open a saved chat"
      : !hasMessages
        ? "Send a message first"
        : undefined;
  const draft = chat.draft;
  const bottomRef = useRef(null);
  const tooLong = draft.length > DEMO_LIMITS.promptLength;
  const canSend = Boolean(draft.trim()) && !offline && !noRealChat && ws.hasContext && !chat.isSending && !tooLong;
  const showCount = draft.length > DEMO_LIMITS.promptLength * 0.8;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [chat.messages, chat.isSending, chat.pendingStep]);

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) chat.sendMessage();
    }
  };

  if (!hasActiveChat) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2.5">
        <ScrollArea className="min-h-0 flex-1 rounded-lg border border-border bg-card shadow-sm">
          <div className="flex min-h-full items-center justify-center p-3">
            <EmptyState
              icon={MessagesSquare}
              title="No chat yet"
              description="Create a chat when you are ready to ask questions against selected sources."
              action={
                <Button size="sm" onClick={ws.newChat} disabled={ws.loading?.chats}>
                  <MessageSquarePlus /> New Chat
                </Button>
              }
              className="w-full max-w-sm"
            />
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <h3 className="min-w-0 truncate text-sm font-semibold">{ws.activeChat.title}</h3>
          <IconButton
            icon={Pencil}
            label="Rename chat"
            size="icon-xs"
            onClick={() => ws.requestRename({ kind: "chat", target: ws.activeChat.id, title: ws.activeChat.title })}
            disabled={noRealChat}
            className="shrink-0 text-muted-foreground hover:text-primary"
          />
        </div>
        <Button
          size="sm"
          onClick={ws.openGenerateModal}
          disabled={!canGenerate}
          title={generateReason}
          className="bg-[linear-gradient(100deg,var(--primary)_0%,var(--primary)_38%,var(--teal)_100%)] text-primary-foreground hover:opacity-95"
        >
          <Sparkles /> Generate Document
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1 rounded-lg border border-border bg-card shadow-sm">
        <div className="flex min-h-full flex-col gap-3 p-3">
          {chat.isLoadingMessages ? (
            <LoadingState rows={3} />
          ) : chat.messages.length ? (
            <>
              {chat.messages.map((m) =>
                m.role === "user" ? (
                  <UserMessage key={m.id} message={m} />
                ) : (
                  <AssistantMessage
                    key={m.id}
                    message={m}
                    selected={m.id === chat.selectedAssistantMessageId}
                    onSelect={() => chat.selectAssistantMessage(m.id)}
                  />
                ),
              )}
              {chat.isSending && <PendingAssistant step={chat.pendingStep} />}
              <div ref={bottomRef} />
            </>
          ) : chat.isSending ? (
            <>
              <PendingAssistant step={chat.pendingStep} />
              <div ref={bottomRef} />
            </>
          ) : (
            <EmptyState
              icon={MessagesSquare}
              title="Ask about your sources"
              description="Answers are grounded in the documents you tick in the source tree, with references."
              action={
                <div className="flex flex-col gap-1">
                  {CHAT_SAMPLE_QUESTIONS.slice(0, 3).map((q) => (
                    <button
                      key={q.text}
                      type="button"
                      onClick={() => ws.askSuggestedQuestion(q)}
                      className="rounded-md border border-border bg-card/60 px-2 py-1 text-left text-[12px] text-foreground transition-colors hover:border-primary/40 hover:bg-accent/60"
                    >
                      {q.text}
                    </button>
                  ))}
                </div>
              }
            />
          )}
        </div>
      </ScrollArea>

      {chat.sendError && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-[12px] text-destructive">
          <span>{chat.sendError.message || "AI generation is temporarily unavailable. Please try again."}</span>
          <Button size="sm" variant="outline" onClick={() => chat.sendMessage()} disabled={!canSend}>
            Retry
          </Button>
        </div>
      )}

      <div className="-mx-1 shrink-0 bg-background px-1 pb-1 pt-1">
        <div className={cn("rounded-lg border border-input bg-card p-2 shadow-sm", !ws.hasContext && "opacity-90")}>
          <Textarea
            rows={2}
            value={draft}
            onChange={(e) => chat.setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={DEMO_LIMITS.promptLength + 200}
            placeholder="Ask about selected documents..."
            aria-label="Chat prompt"
            disabled={chat.isSending}
            className="min-h-0 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-muted-foreground">
              {noRealChat
                ? "Start or select a saved chat to send."
                : !ws.hasContext
                  ? "Tick a document or folder in Sources first."
                  : `Prompt limit ${DEMO_LIMITS.promptLength.toLocaleString()} chars`}
            </span>
            <div className="flex items-center gap-2">
              {showCount && (
                <span className={cn("text-[11px] tabular-nums", tooLong ? "text-destructive" : "text-muted-foreground")}>
                  {draft.length}/{DEMO_LIMITS.promptLength}
                </span>
              )}
              <Button
                size="sm"
                variant="teal"
                onClick={() => chat.sendMessage()}
                disabled={!canSend}
                title={offline ? "Backend is offline" : undefined}
              >
                <Send /> Send
              </Button>
            </div>
          </div>
        </div>
        <p className="px-1 pt-1 text-[10px] leading-snug text-muted-foreground">
          CentralDocs answers from the documents you select. It is not a general chatbot and may say when the selected
          documents do not contain enough evidence.
        </p>
      </div>
    </div>
  );
}

export { ChatPanelShell };
