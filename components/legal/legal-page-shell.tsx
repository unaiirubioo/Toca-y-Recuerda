export function LegalPageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-cream-100 px-4 py-12">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-soft">
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-ink-700">
          ⚠️ Texto de ejemplo. Debe revisarlo un profesional del derecho
          antes de publicar la plataforma en producción.
        </div>
        <h1 className="mb-4 font-display text-2xl font-semibold text-ink-900">{title}</h1>
        <div className="space-y-4 text-sm leading-relaxed text-ink-700">{children}</div>
      </div>
    </main>
  );
}
