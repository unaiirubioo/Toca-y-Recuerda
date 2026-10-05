export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-cream-100 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 h-8 w-48 animate-pulse rounded-lg bg-ink-100" />
        <div className="mb-5 h-6 w-32 animate-pulse rounded-lg bg-ink-100" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
              <div className="h-36 animate-pulse bg-ink-100" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-ink-100" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-ink-100" />
                <div className="h-1.5 w-full animate-pulse rounded-full bg-ink-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
