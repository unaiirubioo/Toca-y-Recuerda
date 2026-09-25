import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Desbloquea Premium" };

export default async function AlbumLimitPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-100 px-4 text-center">
      <div className="max-w-sm">
        <div className="mb-4 text-4xl">❤️</div>
        <h1 className="mb-2 font-display text-2xl font-semibold text-ink-900">
          Tu recuerdo está creciendo
        </h1>
        <p className="mb-8 text-ink-500">
          Has llegado al límite de tu plan gratuito: 1 álbum. Desbloquea
          Premium para crear más recuerdos, con más fotos, vídeos y espacio.
        </p>
        <Link href="/tienda" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          Desbloquear Premium — 4,99 €
        </Link>
        <p className="mt-2 text-xs text-ink-500">Pago único · Para siempre</p>
      </div>
    </main>
  );
}
