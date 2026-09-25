import type { LucideIcon } from "lucide-react";

const COLOR_MAP: Record<string, string> = {
  ink: "bg-ink-900/10 text-ink-900",
  amber: "bg-amber-500/15 text-amber-600",
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
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
  return (
    <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-soft">
      {Icon && (
        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${COLOR_MAP[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div>
        <p className="text-sm text-ink-500">{label}</p>
        <p className="mt-0.5 font-display text-2xl font-semibold text-ink-900">{value}</p>
        {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
      </div>
    </div>
  );
}
