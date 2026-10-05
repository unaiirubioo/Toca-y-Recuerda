export default function EditAlbumLoading() {
  return (
    <main className="min-h-screen bg-cream-100 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-ink-100" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-white" />
        ))}
      </div>
    </main>
  );
}
