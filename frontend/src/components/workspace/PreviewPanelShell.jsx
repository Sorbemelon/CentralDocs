import { useEffect, useState } from "react";
import { AlertTriangle, Download, FileText, FolderOpen, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocStatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { DOC_STATUS } from "@/lib/constants";
import { normalizeDocument } from "@/lib/workspaceData";
import { getDocument, getDocumentStatus, previewDocument } from "@/services/documentApi";
import { getFileIcon, SourceBadge } from "./DocumentList";

function FlagChip({ on, label }) {
  return (
    <Badge variant={on ? "success" : "muted"} className="text-[10px]">
      {label}: {on ? "yes" : "no"}
    </Badge>
  );
}

/** Preview tab. Fetches detail + preview + status when online; safe fields only. */
function PreviewPanelShell({ ws }) {
  const id = ws.previewDocId;
  const listDoc = id ? ws.getDocById(id) : null;
  const [state, setState] = useState({ loading: false, preview: null, status: null, fetchedDoc: null });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: false, preview: null, status: null, fetchedDoc: null });
    if (!id || !ws.online) return undefined;
    setState((s) => ({ ...s, loading: true }));
    Promise.allSettled([previewDocument(id), getDocumentStatus(id), getDocument(id)]).then(([p, st, d]) => {
      if (cancelled) return;
      setState({
        loading: false,
        preview: p.status === "fulfilled" ? p.value?.preview : null,
        status: st.status === "fulfilled" ? st.value : null,
        fetchedDoc: d.status === "fulfilled" && d.value?.document ? normalizeDocument(d.value.document) : null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [id, ws.online]);

  const doc = listDoc || state.fetchedDoc;

  if (!doc) {
    if (state.loading) {
      return <p className="p-1 text-[12px] text-muted-foreground">Loading document…</p>;
    }
    return (
      <EmptyState
        icon={FileText}
        title="No document open"
        description="Use the preview action on a document row or a search result to open it here."
      />
    );
  }

  const { status, preview, loading } = state;
  const Icon = getFileIcon(doc.type);
  const failed = doc.status === DOC_STATUS.failed;
  const attachable = status?.attachable ?? doc.attachable;
  const downloadAvailable = status?.downloadAvailable ?? doc.downloadAvailable;
  const retryAvailable = status?.retryAvailable ?? doc.retryAvailable;
  const searchable = status?.searchable ?? doc.searchable;
  const chunkCount = status?.contentStats?.chunkCount ?? doc.chunkCount ?? 0;
  const statusMessage = status?.statusMessage ?? doc.statusMessage;
  const previewUnavailable = preview?.previewUnavailable;
  const body = preview?.extractedTextPreview || preview?.previewText || doc.excerpt;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
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
            <Button size="sm" variant="outline" onClick={() => ws.downloadDocument(doc)} disabled={downloadAvailable === false}>
              <Download /> Download
            </Button>
            {attachable !== false && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => ws.attach("document", doc.id)}
                disabled={ws.isSelected("document", doc.id)}
                className="hover:text-teal"
              >
                <Plus /> Attach
              </Button>
            )}
            {retryAvailable && (
              <Button size="sm" variant="ghost" onClick={() => ws.retryDocument(doc)} className="hover:text-teal">
                <RefreshCw /> Retry
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <FolderOpen className="size-3.5" /> {doc.folderName || "—"}
          </span>
          <span>·</span>
          <span>Chunks: {chunkCount}</span>
        </div>
      </div>

      {failed && (
        <div className="flex items-start gap-2 rounded-md bg-destructive-subtle px-2.5 py-2 text-[12px] text-destructive-subtle-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{statusMessage || "Processing failed. You can retry if the original file is available."}</span>
        </div>
      )}

      <div className="rounded-md border border-border bg-card p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
        {loading ? (
          <p className="mt-1.5 text-[12px] text-muted-foreground">Loading preview…</p>
        ) : previewUnavailable ? (
          <p className="mt-1.5 text-[12px] text-muted-foreground">Preview not available for this document yet.</p>
        ) : (
          <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">{body}</p>
        )}
        {!ws.online && (
          <p className="mt-2 text-[12px] text-muted-foreground">Connect to the backend for the full text preview.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <FlagChip on={attachable !== false} label="Attachable" />
        <FlagChip on={Boolean(searchable)} label="Searchable" />
        <FlagChip on={downloadAvailable !== false} label="Downloadable" />
      </div>
    </div>
  );
}

export { PreviewPanelShell };
