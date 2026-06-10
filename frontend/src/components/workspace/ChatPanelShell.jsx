import { FileText, Folder, Loader2, MessagesSquare, Quote, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { cn } from "@/lib/cn";
import { DEMO_LIMITS } from "@/lib/constants";
import { CHAT_SAMPLE_QUESTIONS } from "@/data/demoCopy";

function UserMessage({ message }) {
  const docs = message.contextDocTitles || [];
  const folders = message.attachedFolderNames || [];
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="max-w-[80%] whitespace-pre-wrap rounded-lg rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
        {message.content}
      </div>
      {(docs.length > 0 || folders.length > 0) && (
        <Accordion type="single" className="max-w-[80%]">
          <AccordionItem value="ctx">
            <AccordionTrigger className="text-[11px] text-muted-foreground">
              Documents used: {docs.length}
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-1 rounded-md border border-border bg-card p-2 text-[12px]">
              {docs.map((title) => (
                <p key={title} className="flex items-center gap-1.5 text-foreground">
                  <FileText className="size-3 shrink-0 text-primary" />
                  <span className="min-w-0 truncate">{title}</span>
                </p>
              ))}
              {folders.length > 0 && (
                <p className="flex items-center gap-1.5 pt-0.5 text-[11px] text-muted-foreground">
                  <Folder className="size-3 shrink-0" />
                  From {folders.length === 1 ? "folder" : "folders"}: {folders.join(", ")}
                </p>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}

function AssistantMessage({ message, selected, onSelect }) {
  const refs = message.references || [];
  const meta = message.aiMeta;
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "max-w-[80%] whitespace-pre-wrap rounded-lg rounded-bl-sm border bg-card px-3 py-2 text-left text-sm text-card-foreground shadow-sm transition-colors",
          selected ? "border-primary/50 ring-1 ring-primary/20" : "border-border hover:border-primary/30",
        )}
      >
        {message.content}
      </button>
      {(refs.length > 0 || meta) && (
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
              {meta && (
                <p className="pt-1 text-[10px] text-muted-foreground">
                  {[meta.model, meta.latencyMs != null ? `${meta.latencyMs} ms` : null, meta.fallbackUsed ? "fallback" : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
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

/** Chat tab — saved messages above a sticky prompt box (messages scroll behind it). */
function ChatPanelShell({ ws }) {
  const chat = ws.chat;
  const offline = !ws.online;
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
  const tooLong = draft.length > DEMO_LIMITS.promptLength;
  const canSend = Boolean(draft.trim()) && !offline && !noRealChat && ws.hasContext && !chat.isSending && !tooLong;
  const showCount = draft.length > DEMO_LIMITS.promptLength * 0.8;

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) chat.sendMessage();
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-sm font-semibold">{ws.activeChat?.title || "New chat"}</h3>
        <Button size="sm" variant="teal" onClick={ws.openGenerateModal} disabled={!canGenerate} title={generateReason}>
          <Sparkles /> Generate Document
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
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
          </>
        ) : chat.isSending ? (
          <PendingAssistant step={chat.pendingStep} />
        ) : (
          <EmptyState
            icon={MessagesSquare}
            title="Ask about your sources"
            description="Answers are grounded in the documents you tick in the source tree, with references."
            action={
              <div className="flex flex-col gap-1">
                {CHAT_SAMPLE_QUESTIONS.slice(0, 4).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => chat.setDraft(q)}
                    className="rounded-md border border-border bg-card/60 px-2 py-1 text-left text-[12px] text-foreground transition-colors hover:border-primary/40 hover:bg-accent/60"
                  >
                    {q}
                  </button>
                ))}
              </div>
            }
          />
        )}
      </div>

      {chat.sendError && (
        <p className="text-[12px] text-destructive">Couldn’t generate an answer. Your prompt was kept — try again.</p>
      )}

      {/* Sticky prompt box: messages scroll behind it, ChatGPT-style. */}
      <div className="sticky bottom-0 z-10 -mx-1 bg-background px-1 pb-1 pt-1.5">
        <div className={cn("rounded-lg border border-input bg-card p-2 shadow-sm", !ws.hasContext && "opacity-90")}>
          <Textarea
            rows={2}
            value={draft}
            onChange={(e) => chat.setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={DEMO_LIMITS.promptLength + 200}
            placeholder="Ask about selected documents..."
            aria-label="Chat prompt"
            className="min-h-0 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0"
            disabled={offline || noRealChat}
          />
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-muted-foreground">
              {offline
                ? "Backend is offline. Sending requires the backend."
                : noRealChat
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
              <Button size="sm" onClick={() => chat.sendMessage()} disabled={!canSend}>
                {chat.isSending ? <Loader2 className="animate-spin" /> : <Send />} Send
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
