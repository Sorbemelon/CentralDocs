import { Badge } from "@/components/ui/badge";
import { BACKEND_STATUS, DOC_STATUS } from "@/lib/constants";

const SEQUENCE = ["Uploading", "Extracting", "Optimizing", "Chunking", "Embedding", "Ready"];

const RAW_STATUS_LABEL = {
  uploaded: "Uploading",
  extracting: "Extracting",
  optimizing: "Optimizing",
  chunking: "Chunking",
  embedding: "Embedding",
  ready: "Ready",
  failed: "Failed",
};

function variantFor(label) {
  if (!label) return "muted";
  const l = label.toLowerCase();
  if (l.includes("fail")) return "destructive";
  if (l.includes("ready") || l.includes("complete")) return "success";
  if (l.includes("offline")) return "destructive";
  return "warning";
}

/** Current upload/retry operation + the open document's processing status. */
function ProcessingStatusCard({ ws }) {
  const op = ws.operation;
  const previewDoc = ws.previewDocId ? ws.getDocById(ws.previewDocId) : null;

  let current;
  let detail;
  if (op) {
    current = op.status === "complete" ? "Ready" : op.status === "failed" ? "Failed" : "Working";
    detail = op.label;
  } else if (previewDoc) {
    current = RAW_STATUS_LABEL[previewDoc.rawStatus] || (previewDoc.status === DOC_STATUS.ready ? "Ready" : "Processing");
    detail = `${previewDoc.title}`;
  } else if (ws.backendStatus === BACKEND_STATUS.offline) {
    current = "Offline";
    detail = "Backend unavailable — using demo data.";
  } else if (ws.backendStatus === BACKEND_STATUS.starting) {
    current = "Starting";
    detail = "Waking the backend…";
  } else {
    current = "Ready";
    detail = "No active operation.";
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] text-muted-foreground">Current operation</span>
        <Badge variant={variantFor(current)}>{current}</Badge>
      </div>
      {detail && <p className="truncate text-[12px] text-foreground">{detail}</p>}
      <p className="text-[11px] leading-relaxed text-muted-foreground">{SEQUENCE.join(" → ")} · Failed</p>
    </div>
  );
}

export { ProcessingStatusCard };
