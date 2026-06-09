import { Progress } from "@/components/ui/progress";

function UsageRow({ label, used, limit, unit = "" }) {
  const ratio = limit > 0 ? used / limit : 0;
  const tone = ratio >= 1 ? "destructive" : ratio >= 0.8 ? "warning" : "primary";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums text-foreground">
          {used}
          {unit}/{limit}
          {unit}
        </span>
      </div>
      <Progress value={used} max={limit} tone={tone} />
    </div>
  );
}

/** Compact usage/limit rows. */
function UsageCard({ ws }) {
  const u = ws.data.usage;
  return (
    <div className="flex flex-col gap-2.5">
      <UsageRow label="Uploads" used={u.uploads.used} limit={u.uploads.limit} />
      <UsageRow label="Chats" used={u.chats.used} limit={u.chats.limit} />
      <UsageRow label="Prompts" used={u.prompts.used} limit={u.prompts.limit} />
      <UsageRow label="Generated" used={u.generated.used} limit={u.generated.limit} />
      <UsageRow label="Storage" used={u.storageMb.used} limit={u.storageMb.limit} unit="MB" />
    </div>
  );
}

export { UsageCard };
