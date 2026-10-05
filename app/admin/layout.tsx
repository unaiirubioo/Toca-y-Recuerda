import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/security/require-admin";
import { AdminNav } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Barrera de seguridad: sin sesión o sin rol admin => 404.
  await requireAdmin();

  return (
    <div className="min-h-screen bg-cream-100 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="bg-ink-900 px-4 py-4 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:px-5 lg:py-7">
        <div className="mb-4 flex items-center justify-between lg:mb-8 lg:block">
          <div>
            <p className="font-display text-lg font-semibold leading-tight">Toca y Recuerda</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-300">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              Panel de administración
            </p>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-ink-300 hover:text-white lg:hidden"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            App
          </Link>
        </div>

        <AdminNav />

        <Link
          href="/dashboard"
          className="mt-auto hidden items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm text-ink-300 transition-colors hover:bg-white/10 hover:text-white lg:flex"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a la app
        </Link>
      </aside>

      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
