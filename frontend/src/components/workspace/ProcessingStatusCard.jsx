import { Badge } from "@/components/ui/badge";
import { BACKEND_STATUS } from "@/lib/constants";

const PIPELINE = [
  "Uploading",
  "Extracting",
  "Chunking",
  "Embedding",
  "Searching",
  "Generating answer",
  "Saving generated document",
];

/** Current operation status. Badge + short text, not a large empty card. */
function ProcessingStatusCard({ ws }) {
  const starting = ws.backendStatus === BACKEND_STATUS.starting;
  const offline = ws.backendStatus === BACKEND_STATUS.offline;

  const current = offline ? "Failed" : starting ? "Starting backend" : "Ready";
  const variant = offline ? "destructive" : starting ? "warning" : "success";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] text-muted-foreground">Current operation</span>
        <Badge variant={variant}>{current}</Badge>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Live steps will report here: {PIPELINE.join(" → ")}.
      </p>
    </div>
  );
}

export { ProcessingStatusCard };
