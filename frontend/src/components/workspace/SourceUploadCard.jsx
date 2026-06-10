import { useRef, useState } from "react";
import { AlertTriangle, Loader2, Paperclip, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { UPLOAD_ALLOWED_LABEL, validateUploadFile } from "@/lib/workspaceData";
import { UPLOAD_COPY } from "@/data/demoCopy";

/** Tones for the inline operation status line (upload/retry live here, not in a right-panel card). */
function operationTone(status) {
  if (status === "failed") return "text-destructive";
  if (status === "complete") return "text-success-subtle-foreground";
  return "text-muted-foreground";
}

/**
 * Compact upload card pinned to the top of the left sidebar (deliberately not
 * a large dropzone). One file at a time, validated client-side before Upload
 * is enabled; backend re-validates. Shows the current upload/retry status.
 */
function SourceUploadCard({ ws, className }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [validation, setValidation] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState(false);

  const offline = !ws.online;
  const op = ws.operation;
  const showOp = op && ["upload", "retry"].includes(op.kind);

  const pickFile = () => inputRef.current?.click();

  const onFileChange = (e) => {
    const picked = e.target.files?.[0] || null;
    setFailed(false);
    setFile(picked);
    setValidation(picked ? validateUploadFile(picked) : null);
  };

  const clearFile = () => {
    setFile(null);
    setValidation(null);
    setFailed(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!file || !validation?.valid || offline) return;
    setUploading(true);
    setFailed(false);
    const result = await ws.uploadDocument(file);
    setUploading(false);
    if (result?.ok) clearFile();
    else setFailed(true); // keep the file so the user can retry
  };

  const canUpload = Boolean(file && validation?.valid && !uploading && !offline);

  return (
    <div className={cn("flex flex-col gap-1.5 rounded-lg border border-border bg-card p-2 shadow-sm", className)}>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,.csv,.tsv,.pdf,.docx"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Upload className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold leading-tight text-foreground">Upload File</p>
          <p className="text-[10px] leading-snug text-muted-foreground">
            {UPLOAD_ALLOWED_LABEL} · one at a time · {UPLOAD_COPY.sizeCaps}
          </p>
        </div>
        {file ? (
          <Button
            size="xs"
            onClick={handleUpload}
            disabled={!canUpload}
            title={offline ? "Backend is offline" : undefined}
          >
            {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
            {uploading ? "Uploading" : "Upload"}
          </Button>
        ) : (
          <Button size="xs" variant="secondary" onClick={pickFile} disabled={uploading}>
            <Paperclip /> Browse
          </Button>
        )}
      </div>

      {file && (
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-1.5 py-1">
          <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">{file.name}</span>
          {validation?.sizeLabel && (
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{validation.sizeLabel}</span>
          )}
          <Badge variant={validation?.valid ? "success" : "destructive"} className="px-1 py-0 text-[10px]">
            {validation?.valid ? "Ready" : "Invalid"}
          </Badge>
          <button
            type="button"
            onClick={clearFile}
            aria-label="Clear selected file"
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {file && !validation?.valid && validation?.error && (
        <p className="flex items-start gap-1 text-[10px] leading-snug text-destructive">
          <AlertTriangle className="mt-px size-3 shrink-0" />
          {validation.error}
        </p>
      )}

      {failed && <p className="text-[10px] text-destructive">Upload failed. Review the file and try again.</p>}

      {showOp && (
        <p className={cn("flex items-center gap-1.5 text-[10px] leading-tight", operationTone(op.status))}>
          {op.status !== "complete" && op.status !== "failed" ? (
            <Loader2 className="size-3 shrink-0 animate-spin" />
          ) : (
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                op.status === "failed" ? "bg-destructive" : "bg-success",
              )}
            />
          )}
          <span className="truncate">{op.label}</span>
        </p>
      )}
    </div>
  );
}

export { SourceUploadCard };
