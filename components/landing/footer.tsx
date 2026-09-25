import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FinalCta() {
  return (
    <section className="bg-ink-900 px-4 py-16 text-center text-white">
      <h2 className="font-display text-2xl font-semibold sm:text-3xl">
        Tu primer recuerdo te espera.
      </h2>
      <p className="mt-2 text-white/70">Empieza gratis, sin tarjeta.</p>
      <Link href="/registro" className={cn(buttonVariants({ size: "lg" }), "mt-6")}>
        Crear mi recuerdo
      </Link>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-ink-100 bg-white px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm text-ink-500 sm:flex-row">
        <p>© {new Date().getFullYear()} Toca y Recuerda</p>
        <nav className="flex gap-4">
          <Link href="/legal/privacidad" className="hover:text-ink-900">
            Privacidad
          </Link>
          <Link href="/legal/terminos" className="hover:text-ink-900">
            Términos
          </Link>
          <Link href="/legal/cookies" className="hover:text-ink-900">
            Cookies
          </Link>
          <Link href="/legal/aviso-legal" className="hover:text-ink-900">
            Aviso legal
          </Link>
        </nav>
      </div>
    </footer>
  );
}
