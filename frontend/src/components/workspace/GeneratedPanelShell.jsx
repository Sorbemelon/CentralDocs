import { Download, Eye, FolderInput, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocStatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { IconButton } from "@/components/common/IconButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { getFileIcon } from "./DocumentList";

/** Generated documents tab shell. Generated docs are normal documents too. */
function GeneratedPanelShell({ ws }) {
  const { generated } = ws.data;
  const canGenerate = ws.online && ws.activeChat && !ws.activeChat.local && (ws.chat?.messages?.length || 0) > 0;
  const generateReason = !ws.online
    ? "Backend is offline"
    : !ws.activeChat || ws.activeChat.local
      ? "Open a saved chat"
      : (ws.chat?.messages?.length || 0) === 0
        ? "Send a message first"
        : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="size-4 text-teal" /> Generated documents
        </h3>
        <Button size="sm" variant="teal" onClick={ws.openGenerateModal} disabled={!canGenerate} title={generateReason}>
          <Sparkles /> Generate
        </Button>
      </div>

      <Alert variant="info">
        <Info />
        <AlertDescription>
          Generated documents are saved as normal documents: previewable, downloadable, attachable, and searchable.
        </AlertDescription>
      </Alert>

      {generated.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No generated documents yet"
          description="Use Generate Document from the Chat tab to create one."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {generated.map((doc) => {
            const Icon = getFileIcon(doc.type);
            return (
              <div key={doc.id} className="flex items-center gap-2 rounded-md border border-border bg-card p-2.5">
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{doc.title}</p>
                  <div className="mt-0.5 flex items-center gap-1">
                    <Badge variant="outline">{doc.type}</Badge>
                    <DocStatusBadge status={doc.status} />
                    <span className="text-[11px] text-muted-foreground">{doc.createdAt}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center">
                  <IconButton icon={Eye} label="Preview" onClick={() => ws.openPreview(doc.id)} />
                  <IconButton icon={Download} label="Download" onClick={() => ws.downloadDocument(doc)} />
                  <IconButton icon={Plus} label="Attach" onClick={() => ws.attach("document", doc.id)} disabled={ws.isSelected("document", doc.id) || doc.attachable === false} />
                  <IconButton icon={FolderInput} label="Move" onClick={() => ws.notifyDeferred("Move document")} />
                  <IconButton icon={Trash2} label="Delete" onClick={() => ws.deleteDocument(doc)} className="hover:text-destructive" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { GeneratedPanelShell };
