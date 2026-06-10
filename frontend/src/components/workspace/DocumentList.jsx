import {
  File,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Presentation,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
