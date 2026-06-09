import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * Compact upload placeholder (deliberately small, not an oversized drop zone).
 * Wiring deferred to a later phase.
 */
function SourceUploadCard({ ws, className }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-dashed border-border bg-card/60 px-2.5 py-2",
        className,
      )}
    >
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Upload className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium leading-tight text-foreground">Upload a document</p>
        <p className="truncate text-[11px] text-muted-foreground">txt, md, csv, tsv, pdf, docx · one at a time</p>
      </div>
      <Button size="xs" variant="secondary" onClick={() => ws.notifyDeferred("Upload")}>
        Upload
      </Button>
    </div>
  );
}

export { SourceUploadCard };
