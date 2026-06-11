import { cn } from "@/lib/cn";

const KIND_TO_EXTENSION = {
  markdown: "md",
  text: "txt",
  csv: "csv",
  tsv: "tsv",
  pdf: "pdf",
  docx: "docx",
  xlsx: "xlsx",
  pptx: "pptx",
  image: "png",
  audio: "mp3",
  video: "mp4",
};

const EXTENSION_TONES = {
  md: "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/45 dark:text-indigo-300",
  txt: "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300",
  csv: "border-lime-300 bg-lime-50 text-lime-700 dark:border-lime-800 dark:bg-lime-950/45 dark:text-lime-300",
  tsv: "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/45 dark:text-teal-300",
  pdf: "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/45 dark:text-red-300",
  docx: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/45 dark:text-blue-300",
  xlsx: "border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/45 dark:text-green-300",
  pptx: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/45 dark:text-amber-300",
  png: "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-800 dark:bg-fuchsia-950/45 dark:text-fuchsia-300",
  jpg: "border-pink-300 bg-pink-50 text-pink-700 dark:border-pink-800 dark:bg-pink-950/45 dark:text-pink-300",
  jpeg: "border-pink-300 bg-pink-50 text-pink-700 dark:border-pink-800 dark:bg-pink-950/45 dark:text-pink-300",
  mp3: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/45 dark:text-violet-300",
  wav: "border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/45 dark:text-purple-300",
  mp4: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/45 dark:text-rose-300",
  mov: "border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/45 dark:text-cyan-300",
};

function normalizeExtension(type) {
  const raw = String(type || "").trim().replace(/^\./, "").toLowerCase();
  if (!raw || raw === "file" || raw === "folder") return null;
  return KIND_TO_EXTENSION[raw] || raw;
}

function FileExtensionTag({ type, className }) {
  const extension = normalizeExtension(type);
  if (!extension) return null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded border px-1 py-0 text-[10px] font-medium leading-4",
        EXTENSION_TONES[extension] || "border-border bg-card text-muted-foreground",
        className,
      )}
    >
      .{extension}
    </span>
  );
}

export { FileExtensionTag, normalizeExtension };
