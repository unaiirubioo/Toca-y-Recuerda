import type { ReactNode } from "react";

export function EmptyState({
  emoji,
  title,
  description,
  action,
}: {
  emoji: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-100 bg-white px-6 py-16 text-center">
      <div className="mb-4 text-5xl">{emoji}</div>
      <h2 className="mb-2 font-display text-xl font-semibold text-ink-900">{title}</h2>
      <p className="mb-6 max-w-sm text-ink-500">{description}</p>
      {action}
    </div>
  );
}
