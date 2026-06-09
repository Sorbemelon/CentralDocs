import { FileStack, Folder, Info, Quote, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/cn";

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

/** Example user message with collapsed attached-context snapshot. */
function UserMessage({ ws }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="max-w-[80%] rounded-lg rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
        What are the rollout risks?
      </div>
      <Accordion type="single" className="max-w-[80%]">
        <AccordionItem value="ctx">
          <AccordionTrigger className="text-[11px] text-muted-foreground">
            Attached context used: {ws.counts.folders} folders, {ws.counts.resolved} documents
          </AccordionTrigger>
          <AccordionContent className="rounded-md border border-border bg-card p-2 text-[12px]">
            Snapshot of folders and resolved documents captured at send time. Populated when chat is wired.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

/** Example assistant message with collapsed references. */
function AssistantMessage() {
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="max-w-[80%] rounded-lg rounded-bl-sm border border-border bg-card px-3 py-2 text-sm text-card-foreground">
        Answers will appear here, grounded in the attached sources, with inline citation markers like
        {" "}
        <span className="font-medium text-primary">[1]</span>.
      </div>
      <Accordion type="single" className="max-w-[80%]">
        <AccordionItem value="refs">
          <AccordionTrigger className="text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Quote className="size-3" /> References used: 4
            </span>
          </AccordionTrigger>
          <AccordionContent className="rounded-md border border-border bg-card p-2 text-[12px]">
            Each reference shows the document title, locator, excerpt, score, and a used-for note.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

/** Chat tab shell. Visual structure for future citations/snapshots; not wired. */
function ChatPanelShell({ ws }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{ws.activeChat?.title || "New chat"}</h3>
          <p className="text-[11px] text-muted-foreground">
            Selection persists across prompts in this chat.
          </p>
        </div>
        <Button size="sm" variant="teal" onClick={ws.openGenerateModal}>
          <Sparkles /> Generate Document
        </Button>
      </div>

      {ws.hasContext ? (
        <div className="rounded-md border border-border bg-card/60 p-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Attached context
          </p>
          <ContextChips ws={ws} />
        </div>
      ) : (
        <Alert variant="info">
          <Info />
          <AlertDescription>Select a document or folder first.</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3 rounded-md border border-border bg-background p-3">
        <UserMessage ws={ws} />
        <AssistantMessage />
      </div>

      <div className={cn("rounded-md border border-input bg-card p-2", !ws.hasContext && "opacity-90")}>
        <Textarea
          rows={2}
          placeholder="Ask about selected documents..."
          className="min-h-0 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ws.notifyDeferred("Send message");
            }
          }}
        />
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-muted-foreground">Prompt limit 1,500 chars · 10 prompts/session</span>
          <Button size="sm" onClick={() => ws.notifyDeferred("Send message")}>
            <Send /> Send
          </Button>
        </div>
      </div>
    </div>
  );
}

export { ChatPanelShell };
