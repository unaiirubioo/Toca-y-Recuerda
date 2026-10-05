import type { LucideIcon } from "lucide-react";

const COLOR_MAP: Record<string, { chip: string; bar: string }> = {
  ink: { chip: "bg-ink-900 text-cream-100", bar: "bg-ink-700" },
  amber: { chip: "bg-amber-500 text-white", bar: "bg-amber-500" },
  success: { chip: "bg-success text-white", bar: "bg-success" },
  danger: { chip: "bg-danger text-white", bar: "bg-danger" },
};

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  color = "ink",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  color?: keyof typeof COLOR_MAP;
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.ink!;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-ink-100/70 bg-white p-5 shadow-soft">
      <span className={`absolute inset-y-0 left-0 w-1 ${c.bar}`} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-ink-500">{label}</p>
          <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink-900">{value}</p>
          {hint && <p className="mt-1.5 text-xs text-ink-500">{hint}</p>}
        </div>
        {Icon && (
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${c.chip}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
