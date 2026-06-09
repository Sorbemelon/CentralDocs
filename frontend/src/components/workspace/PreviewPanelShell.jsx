import { Download, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocStatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { FileText } from "lucide-react";
import { DOC_STATUS } from "@/lib/constants";
import { getFileIcon, SourceBadge } from "./DocumentList";

/** Preview tab shell. Shows the opened document (or a hint to open one). */
function PreviewPanelShell({ ws }) {
  const doc = ws.previewDocId ? ws.getDocById(ws.previewDocId) : null;

  if (!doc) {
    return (
      <EmptyState
        icon={FileText}
        title="No document open"
        description="Use the preview action on any document row to open it here."
      />
    );
  }

  const Icon = getFileIcon(doc.type);
  const failed = doc.status === DOC_STATUS.failed;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{doc.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <Badge variant="outline">{doc.type}</Badge>
              <SourceBadge source={doc.source} />
              <DocStatusBadge status={doc.status} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={() => ws.notifyDeferred("Download")}>
            <Download /> Download
          </Button>
          <Button size="sm" variant="ghost" onClick={() => ws.attach("document", doc.id)} disabled={ws.isSelected("document", doc.id)}>
            <Plus /> Attach
          </Button>
          {failed && (
            <Button size="sm" variant="ghost" onClick={() => ws.notifyDeferred("Retry processing")}>
              <RefreshCw /> Retry
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-foreground">{doc.excerpt}</p>
        <p className="mt-2 text-[12px] text-muted-foreground">
          Optimized text and metadata preview will render here once preview is wired.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-md border border-border bg-card/60 px-3 py-2 text-[12px]">
        <span className="text-muted-foreground">Chunk / search index status</span>
        <Badge variant={doc.status === DOC_STATUS.ready ? "success" : "warning"}>
          {doc.status === DOC_STATUS.ready ? "Indexed" : "Pending"}
        </Badge>
      </div>
    </div>
  );
}

export { PreviewPanelShell };
