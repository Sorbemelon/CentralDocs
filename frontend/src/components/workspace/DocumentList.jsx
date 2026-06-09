import {
  Download,
  Eye,
  File,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Plus,
  Presentation,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DocStatusBadge } from "@/components/common/StatusBadge";
import { IconButton } from "@/components/common/IconButton";
import { cn } from "@/lib/cn";
import { SOURCE_KIND } from "@/lib/constants";

/** Map a short type code to a lucide file icon. */
export function getFileIcon(type) {
  switch ((type || "").toUpperCase()) {
    case "MD":
    case "TXT":
    case "PDF":
    case "DOCX":
      return FileText;
    case "CSV":
    case "TSV":
    case "XLSX":
      return FileSpreadsheet;
    case "PPTX":
      return Presentation;
    case "PNG":
    case "JPG":
    case "JPEG":
      return FileImage;
    case "MP3":
    case "WAV":
      return FileAudio;
    case "MP4":
    case "MOV":
      return FileVideo;
    default:
      return File;
  }
}

const SOURCE_LABELS = {
  [SOURCE_KIND.mock]: { label: "Mock", variant: "muted" },
  [SOURCE_KIND.uploaded]: { label: "Uploaded", variant: "teal" },
  [SOURCE_KIND.generated]: { label: "Generated", variant: "success" },
};

/** Provenance badge: Mock / Uploaded / Generated. */
export function SourceBadge({ source, className }) {
  const cfg = SOURCE_LABELS[source] || SOURCE_LABELS[SOURCE_KIND.mock];
  return (
    <Badge variant={cfg.variant} className={className}>
      {cfg.label}
    </Badge>
  );
}

/** A single compact document row with attach/preview/download/delete actions. */
export function DocumentRow({ ws, doc }) {
  const Icon = getFileIcon(doc.type);
  const selected = ws.isSelected("document", doc.id);

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 transition-colors hover:bg-accent/60",
        selected && "border-border bg-accent/40",
      )}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium leading-tight text-foreground">{doc.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          <Badge variant="outline" className="px-1 py-0 text-[10px]">{doc.type}</Badge>
          <SourceBadge source={doc.source} />
          <DocStatusBadge status={doc.status} />
        </div>
      </div>

      <div className="flex shrink-0 items-center opacity-70 transition-opacity group-hover:opacity-100">
        <IconButton
          icon={Plus}
          label={selected ? "In context" : "Attach to context"}
          onClick={() => ws.attach("document", doc.id)}
          disabled={selected}
          className={cn(selected && "text-primary")}
        />
        <IconButton icon={Eye} label="Preview" onClick={() => ws.openPreview(doc.id)} />
        <IconButton icon={Download} label="Download" onClick={() => ws.notifyDeferred("Download")} />
        {doc.readOnly ? (
          <IconButton
            icon={Trash2}
            label="Read-only (mock cannot be deleted)"
            disabled
            className="opacity-40"
          />
        ) : (
          <IconButton
            icon={Trash2}
            label="Delete"
            onClick={() => ws.notifyDeferred("Delete document")}
            className="hover:text-destructive"
          />
        )}
      </div>
    </div>
  );
}

/** Compact list of documents. */
function DocumentList({ ws, documents }) {
  return (
    <div className="flex flex-col gap-0.5">
      {documents.map((doc) => (
        <DocumentRow key={doc.id} ws={ws} doc={doc} />
      ))}
    </div>
  );
}

export { DocumentList };
