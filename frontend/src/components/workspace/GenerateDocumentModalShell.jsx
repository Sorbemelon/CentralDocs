import { useState } from "react";
import { Sparkles } from "lucide-react";
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

function OptionToggle({ id, label, value, onChange }) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-[13px] text-foreground">
      <input
        id={id}
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-input accent-[var(--primary)]"
      />
      {label}
    </label>
  );
}

/**
 * Generate Document modal shell. Opens from the Chat header.
 * UI/validation surface only; submitting shows "not wired yet".
 */
function GenerateDocumentModalShell({ ws, open, onOpenChange }) {
  const [submitting, setSubmitting] = useState(false);
  const [includeReferences, setIncludeReferences] = useState(true);
  const [includeContext, setIncludeContext] = useState(true);

  const handleGenerate = () => {
    setSubmitting(true);
    ws.notifyDeferred("Generate document");
    setSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-teal" /> Generate Document
          </DialogTitle>
          <DialogDescription>
            Describe the document in natural language. Generated files are saved as normal documents.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="gen-instruction" className="text-[12px] font-medium text-foreground">
              Instruction
            </label>
            <Textarea
              id="gen-instruction"
              rows={4}
              maxLength={2000}
              placeholder="Write a concise internal briefing with background, findings, risks, decisions, next steps, and references."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="gen-filename" className="text-[12px] font-medium text-foreground">
              Filename
            </label>
            <Input id="gen-filename" defaultValue="orchid-rollout-brief.md" />
          </div>

          <div className="flex flex-col gap-2">
            <OptionToggle id="gen-refs" label="Include references" value={includeReferences} onChange={setIncludeReferences} />
            <OptionToggle id="gen-ctx" label="Include current selected context" value={includeContext} onChange={setIncludeContext} />
          </div>

          <div className="rounded-md border border-border bg-muted/50 p-2 text-[12px] text-muted-foreground">
            Source preview: {ws.counts.folders} folders, {ws.counts.documents} documents
            {" "}({ws.counts.resolved} resolved) will be used as supporting context.
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="teal" size="sm" onClick={handleGenerate} disabled={submitting}>
            <Sparkles /> Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { GenerateDocumentModalShell };
