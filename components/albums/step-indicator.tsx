export function StepIndicator({ step, total }: { step: number; total: number }) {
  const percent = ((step + 1) / total) * 100;
  return (
    <div className="mb-8">
      <div className="mb-2 flex justify-between text-xs text-ink-500">
        <span>
          Paso {step + 1} de {total}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-50">
        <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
