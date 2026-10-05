export function SimpleBarChart({
  title,
  data,
}: {
  title: string;
  data: { label: string; value: number; color?: string }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="rounded-2xl bg-white p-5 shadow-soft">
      <h3 className="mb-4 font-display text-base font-semibold text-ink-900">{title}</h3>
      <div className="space-y-3">
        {data.map((d) => (
          <div key={d.label}>
            <div className="mb-1 flex justify-between text-xs text-ink-500">
              <span>{d.label}</span>
              <span>{d.value}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-ink-50">
              <div
                className="h-full rounded-full"
                style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color ?? "#D8933B" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
