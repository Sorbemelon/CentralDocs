import { useRef, useState } from "react";
import { AlertTriangle, Loader2, Paperclip, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { UPLOAD_ALLOWED_LABEL, validateUploadFile } from "@/lib/workspaceData";
import { UPLOAD_COPY } from "@/data/demoCopy";

/**
 * Compact upload card (deliberately not a large dropzone). One file at a time,
 * validated client-side before Upload is enabled; backend re-validates.
 * States: idle / invalid / ready / uploading / complete / failed.
 */
function SourceUploadCard({ ws, className }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [validation, setValidation] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState(false);

  const offline = !ws.online;

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
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border border-dashed border-border bg-card/60 p-2.5",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,.csv,.tsv,.pdf,.docx"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="flex items-center gap-2">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Upload className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium leading-tight text-foreground">Upload a document</p>
          <p className="truncate text-[11px] text-muted-foreground">{UPLOAD_ALLOWED_LABEL} · one at a time</p>
        </div>
        <Button size="xs" variant="secondary" onClick={pickFile} disabled={uploading}>
          <Paperclip /> Choose
        </Button>
      </div>

      {!file && (
        <p className="text-[10px] leading-tight text-muted-foreground">{UPLOAD_COPY.sizeCaps}</p>
      )}

      {file && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1">
          <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">{file.name}</span>
          {validation?.sizeLabel && (
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{validation.sizeLabel}</span>
          )}
          {validation?.valid ? (
            <Badge variant="success">Ready</Badge>
          ) : (
            <Badge variant="destructive">Invalid</Badge>
          )}
          <button
            type="button"
            onClick={clearFile}
            aria-label="Clear selected file"
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {file && !validation?.valid && validation?.error && (
        <p className="flex items-start gap-1 text-[11px] text-destructive">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          {validation.error}
        </p>
      )}

      {failed && (
        <p className="text-[11px] text-destructive">Upload failed. Review the file and try again.</p>
      )}

      {offline ? (
        <p className="text-[11px] text-muted-foreground">Backend required to upload — currently offline.</p>
      ) : (
        <Button size="sm" className="w-full" onClick={handleUpload} disabled={!canUpload}>
          {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
          {uploading ? "Uploading…" : "Upload"}
        </Button>
      )}
    </div>
  );
}

export { SourceUploadCard };
