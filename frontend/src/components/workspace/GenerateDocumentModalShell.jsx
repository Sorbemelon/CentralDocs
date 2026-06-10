import { AlertTriangle, Download, Eye, Info, Loader2, Plus, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/cn";
import { DEMO_LIMITS } from "@/lib/constants";
import { GENERATED_INSTRUCTION_PLACEHOLDER } from "@/data/demoCopy";

function OptionToggle({ id, label, value, onChange, disabled }) {
  return (
    <label htmlFor={id} className={cn("flex items-center gap-2 text-[13px] text-foreground", disabled && "opacity-60")}>
      <input
        id={id}
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="size-4 rounded border-input accent-primary"
      />
      {label}
    </label>
  );
}

function CountChip({ label, value, muted }) {
  return (
    <span
      className={cn(
        "rounded-md border border-border bg-card px-1.5 py-0.5 text-[11px] tabular-nums",
        muted ? "text-muted-foreground/60" : "text-muted-foreground",
      )}
    >
      {label}: <span className="font-medium text-foreground">{value}</span>
    </span>
  );
}

/**
 * Generate Document modal. Opens from the Chat header and posts to
 * POST /chats/:id/generated-documents. md/txt only; .pdf/.docx and path
 * segments are rejected before submit. Shows only safe fields (no hidden
 * prompt, provider data, storage keys, or download URLs).
 */
function GenerateDocumentModalShell({ ws, open, onOpenChange }) {
  const gen = ws.generate;
  const online = ws.online;
  const noRealChat = !ws.activeChat || ws.activeChat.local;
  const messages = ws.chat?.messages || [];
  const messageCount = messages.length;
  const refCount = messages.reduce((n, m) => n + (m.references?.length || 0), 0);
  const counts = ws.counts;
  const result = gen.generatedResult;
  const doc = result?.document || null;

  const insMax = DEMO_LIMITS.generateInstructionLength;
  const insLen = gen.instruction.length;
  const showInsCount = insLen > insMax * 0.8;
  const insV = gen.validateGeneratedInstruction(gen.instruction);
  const fnV = gen.validateGeneratedFilename(gen.filename);

  const blockReason = !online
    ? "Backend is offline. Generation requires the backend."
    : noRealChat
      ? "Open a saved chat to generate a document."
      : messageCount === 0
        ? "Send at least one message in this chat first."
        : null;

  const canGenerate = !blockReason && insV.valid && fnV.valid && !gen.isGenerating;
  const attached = doc ? ws.isSelected("document", doc.id) : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-teal" /> Generate Document
          </DialogTitle>
          <DialogDescription>
            Describe the document in natural language. Generated files are saved as normal documents (.md or .txt).
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <>
            <DialogBody className="flex flex-col gap-3">
              <div className="flex items-start gap-2 rounded-md border border-teal/30 bg-teal-subtle px-3 py-2">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-teal" />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">Generated document created</p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {doc.title} · {doc.type}
                  </p>
                </div>
              </div>
              <p className="text-[12px] text-muted-foreground">
                Saved to your documents — it also appears in Sources and the Generated tab.
              </p>
            </DialogBody>
            <DialogFooter className="flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  ws.openPreview(doc.id);
                  onOpenChange(false);
                }}
              >
                <Eye /> Open Preview
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => ws.downloadDocument(doc)}
                disabled={doc.downloadAvailable === false}
              >
                <Download /> Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => ws.attach("document", doc.id)}
                disabled={attached || doc.attachable === false}
              >
                <Plus /> {attached ? "Attached" : "Attach"}
              </Button>
              <Button variant="teal" size="sm" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogBody className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="gen-instruction" className="text-[12px] font-medium text-foreground">
                  Instruction
                </label>
                <Textarea
                  id="gen-instruction"
                  rows={4}
                  maxLength={insMax + 200}
                  value={gen.instruction}
                  onChange={(e) => gen.setInstruction(e.target.value)}
                  placeholder={GENERATED_INSTRUCTION_PLACEHOLDER}
                  disabled={gen.isGenerating}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-destructive">
                    {!insV.valid && gen.instruction ? insV.error : ""}
                  </span>
                  {showInsCount && (
                    <span
                      className={cn("text-[11px] tabular-nums", insLen > insMax ? "text-destructive" : "text-muted-foreground")}
                    >
                      {insLen}/{insMax}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="gen-filename" className="text-[12px] font-medium text-foreground">
                  Filename
                </label>
                <Input
                  id="gen-filename"
                  value={gen.filename}
                  onChange={(e) => gen.setFilename(e.target.value)}
                  disabled={gen.isGenerating}
                />
                {!fnV.valid ? (
                  <span className="text-[11px] text-destructive">{fnV.error}</span>
                ) : fnV.value !== gen.filename.trim() ? (
                  <span className="text-[11px] text-muted-foreground">Will be saved as {fnV.value}</span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">Only .md and .txt are supported.</span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <OptionToggle
                  id="gen-refs"
                  label="Include references"
                  value={gen.includeReferences}
                  onChange={gen.setIncludeReferences}
                  disabled={gen.isGenerating}
                />
                <OptionToggle
                  id="gen-ctx"
                  label="Include current selected context"
                  value={gen.includeCurrentSelectedDocuments}
                  onChange={gen.setIncludeCurrentSelectedDocuments}
                  disabled={gen.isGenerating}
                />
              </div>

              <div className="flex flex-col gap-1.5 rounded-md border border-border bg-muted/40 p-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Source preview</p>
                <div className="flex flex-wrap items-center gap-1">
                  <CountChip label="Messages" value={messageCount} />
                  <CountChip label="References" value={refCount} muted={!gen.includeReferences} />
                  <CountChip label="Folders" value={counts.folders} muted={!gen.includeCurrentSelectedDocuments} />
                  <CountChip label="Documents" value={counts.documents} muted={!gen.includeCurrentSelectedDocuments} />
                </div>
              </div>

              {gen.isGenerating ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-[12px] text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> {gen.genStep || "Generating document"}…
                </div>
              ) : blockReason ? (
                <Alert variant="info">
                  <Info />
                  <AlertDescription>{blockReason}</AlertDescription>
                </Alert>
              ) : gen.generationError ? (
                <Alert variant="destructive">
                  <AlertTriangle />
                  <AlertDescription>{gen.generationError}</AlertDescription>
                </Alert>
              ) : null}
            </DialogBody>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={gen.isGenerating}>
                Cancel
              </Button>
              <Button variant="teal" size="sm" onClick={() => gen.generateDocument()} disabled={!canGenerate}>
                {gen.isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { GenerateDocumentModalShell };
