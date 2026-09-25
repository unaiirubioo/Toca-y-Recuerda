import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function LandingHeader() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-30 border-b border-ink-100/60 bg-cream-100/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.jpeg" alt="Toca y Recuerda" width={32} height={32} className="rounded-full" />
          <span className="font-display font-semibold text-ink-900">Toca y Recuerda</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-ink-700 sm:flex">
          <a href="#como-funciona" className="hover:text-ink-900">
            Cómo funciona
          </a>
          <Link href="/tienda" className="hover:text-ink-900">
            Precios
          </Link>
        </nav>

        {data.user ? (
          <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }))}>
            Ir a mi panel
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden text-sm text-ink-700 hover:text-ink-900 sm:block">
              Iniciar sesión
            </Link>
            <Link href="/registro" className={cn(buttonVariants({ size: "sm" }))}>
              Crear mi recuerdo
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
