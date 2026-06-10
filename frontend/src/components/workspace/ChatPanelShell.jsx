import { FileStack, Folder, Info, Loader2, MessagesSquare, Quote, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { cn } from "@/lib/cn";
import { DEMO_LIMITS } from "@/lib/constants";
import { CHAT_SAMPLE_QUESTIONS } from "@/data/demoCopy";

function ContextChips({ ws }) {
  if (!ws.hasContext) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {ws.selectedFolders.map((f) => (
        <Badge key={f.id} variant="secondary" className="gap-1">
          <Folder className="size-3" /> {f.name}
        </Badge>
      ))}
      {ws.selectedDocs.map((d) => (
        <Badge key={d.id} variant="outline" className="gap-1">
          <FileStack className="size-3" /> {d.title}
        </Badge>
      ))}
    </div>
  );
}

function UserMessage({ message }) {
  const { folders, documents, resolved } = message.attachedCounts || {};
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="max-w-[80%] whitespace-pre-wrap rounded-lg rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
        {message.content}
      </div>
      {(folders || documents) > 0 && (
        <Accordion type="single" className="max-w-[80%]">
          <AccordionItem value="ctx">
            <AccordionTrigger className="text-[11px] text-muted-foreground">
              Attached context used: {folders || 0} folders, {documents || 0} documents
            </AccordionTrigger>
            <AccordionContent className="rounded-md border border-border bg-card p-2 text-[12px] text-muted-foreground">
              Snapshot captured at send time: {folders || 0} folders, {documents || 0} documents, {resolved || 0} resolved.
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
          "max-w-[80%] whitespace-pre-wrap rounded-lg rounded-bl-sm border bg-card px-3 py-2 text-left text-sm text-card-foreground transition-colors",
          selected ? "border-primary/50" : "border-border hover:border-primary/30",
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
            <AccordionContent className="flex flex-col gap-1 rounded-md border border-border bg-card p-2 text-[12px]">
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

/** Chat tab — renders saved messages and sends prompts to the active chat. */
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{ws.activeChat?.title || "New chat"}</h3>
          <p className="text-[11px] text-muted-foreground">Selection persists across prompts in this chat.</p>
        </div>
        <Button
          size="sm"
          variant="teal"
          onClick={ws.openGenerateModal}
          disabled={!canGenerate}
          title={generateReason}
        >
          <Sparkles /> Generate Document
        </Button>
      </div>

      {ws.hasContext ? (
        <div className="rounded-md border border-border bg-card/60 p-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Attached context</p>
          <ContextChips ws={ws} />
        </div>
      ) : (
        <Alert variant="info">
          <Info />
          <AlertDescription>Select a document or folder first.</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3 rounded-md border border-border bg-background p-3">
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
            description="Answers are grounded in the documents and folders you attach, with references."
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

      <div className={cn("rounded-md border border-input bg-card p-2", !ws.hasContext && "opacity-90")}>
        <Textarea
          rows={2}
          value={draft}
          onChange={(e) => chat.setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={DEMO_LIMITS.promptLength + 200}
          placeholder="Ask about selected documents..."
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
                  ? "Select a document or folder first."
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
    </div>
  );
}

export { ChatPanelShell };
