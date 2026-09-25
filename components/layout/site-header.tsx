import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Cabecera usada en toda la plataforma (no solo en la landing), al
 * estilo de referencia que nos pasaste: logo a la izquierda, navegación
 * a las secciones del inicio en el centro, y a la derecha "Entrar" +
 * "Comprar" (o "Mi cuenta" si ya hay sesión).
 */
export async function SiteHeader() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-30 border-b border-ink-100/60 bg-cream-100/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex flex-shrink-0 items-center gap-2">
          <Image src="/logo.jpeg" alt="Toca y Recuerda" width={32} height={32} className="rounded-full" />
          <span className="hidden font-display font-semibold text-ink-900 sm:inline">Toca y Recuerda</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-ink-700 lg:flex">
          <Link href="/#como-funciona" className="hover:text-ink-900">
            Cómo funciona
          </Link>
          <Link href="/#packs" className="hover:text-ink-900">
            Packs
          </Link>
          <Link href="/#momentos" className="hover:text-ink-900">
            Momentos
          </Link>
          <Link href="/blog" className="hover:text-ink-900">
            Blog
          </Link>
        </nav>

        <div className="flex flex-shrink-0 items-center gap-2">
          {data.user ? (
            <>
              <Link href="/cuenta" className="hidden text-sm text-ink-700 hover:text-ink-900 sm:block">
                Mi cuenta
              </Link>
              <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }))}>
                Mi panel
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm text-ink-700 hover:text-ink-900 sm:block">
                Entrar
              </Link>
              <Link href="/tienda" className={cn(buttonVariants({ size: "sm" }))}>
                Comprar
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
