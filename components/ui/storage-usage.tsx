import { cn } from "@/lib/utils";

function formatMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
}

export function StorageUsage({
  usedMb,
  limitMb,
  className,
}: {
  usedMb: number;
  limitMb: number;
  className?: string;
}) {
  const percent = limitMb > 0 ? Math.min(100, (usedMb / limitMb) * 100) : 0;
  const isNearLimit = percent >= 90;

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1 flex items-center justify-between text-xs text-ink-500">
        <span>
          {formatMb(usedMb)} / {formatMb(limitMb)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-50">
        <div
          className={cn("h-full rounded-full", isNearLimit ? "bg-danger" : "bg-amber-500")}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
