export default function StoreLoading() {
  return (
    <main className="min-h-screen bg-cream-100 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-12">
        <div className="text-center">
          <div className="mx-auto h-9 w-40 animate-pulse rounded-lg bg-ink-100" />
        </div>
        {Array.from({ length: 3 }).map((_, section) => (
          <div key={section}>
            <div className="mb-5 h-6 w-32 animate-pulse rounded-lg bg-ink-100" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl bg-white" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
