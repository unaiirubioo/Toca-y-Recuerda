import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Sparkles, Camera, Film, HardDrive } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStoreProducts } from "@/lib/queries/products";
import { formatEuros } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Desbloquea Premium" };

export default async function AlbumLimitPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  // El precio ya no va escrito a mano (spec: evita que la página se
  // desincronice si cambia el precio en la tienda) — se lee del mismo
  // catálogo que usa /tienda.
  const products = await getStoreProducts();
  const premium = products.find((p) => p.slug === "PREMIUM") ?? products[0] ?? null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-100 px-4 py-10 text-center">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 px-8 pb-8 pt-10 text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl font-semibold">Tu recuerdo está creciendo</h1>
        </div>

        <div className="px-8 py-8">
          <p className="mb-6 text-sm text-ink-500">
            Ya has usado tu álbum gratuito de por vida. Desbloquea Premium para crear más recuerdos, con
            más fotos, vídeos y espacio.
          </p>

          {premium && (
            <>
              <div className="mb-5 flex items-baseline justify-center gap-1">
                <span className="font-display text-4xl font-bold text-ink-900">
                  {formatEuros(premium.priceCents)}
                </span>
                <span className="text-sm text-ink-500">pago único</span>
              </div>

              <ul className="mb-6 space-y-2.5 text-left text-sm text-ink-700">
                {premium.photoLimit && (
                  <li className="flex items-center gap-2.5">
                    <Camera className="h-4 w-4 flex-shrink-0 text-amber-600" />
                    Hasta {premium.photoLimit} fotos y {premium.videoLimit} vídeos
                  </li>
                )}
                {premium.storageLimitMb && (
                  <li className="flex items-center gap-2.5">
                    <HardDrive className="h-4 w-4 flex-shrink-0 text-amber-600" />
                    Mucho más espacio de almacenamiento
                  </li>
                )}
                <li className="flex items-center gap-2.5">
                  <Film className="h-4 w-4 flex-shrink-0 text-amber-600" />
                  Diseño con IA incluido, como siempre
                </li>
              </ul>

              <Link href="/tienda" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
                Desbloquear Premium — {formatEuros(premium.priceCents)}
              </Link>
            </>
          )}

          <p className="mt-3 text-xs text-ink-500">Pago único · Para siempre</p>
          <Link href="/dashboard" className="mt-4 block text-xs text-ink-500 hover:underline">
            Ahora no, volver a mi panel
          </Link>
        </div>
      </div>
    </main>
  );
}
