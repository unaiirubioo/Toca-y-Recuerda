import Link from "next/link";
import { Check } from "lucide-react";
import { getStoreProducts } from "@/lib/queries/products";
import { formatEuros } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Insignias de marketing para la portada — no confundir con el
// "Mejor precio" de /tienda (ese se calcula solo, de forma honesta,
// por precio/unidad). Aquí solo destacamos visualmente 2-3 productos
// concretos para guiar la decisión, sin inventar datos ni presionar
// con falsa urgencia.
const HIGHLIGHTS: Record<string, { label: string; className: string }> = {
  PREMIUM: { label: "Para empezar", className: "bg-ink-100 text-ink-700" },
  PACK_VIAJES: { label: "⭐ Más popular", className: "bg-amber-500 text-white" },
  PACK_COLECCION: { label: "Mejor valorado", className: "bg-ink-900 text-white" },
};

export async function PacksTeaser() {
  const products = await getStoreProducts();
  const featured = products.filter((p) => ["PREMIUM", "PACK_VIAJES", "PACK_COLECCION", "NFC_1"].includes(p.slug));

  return (
    <section id="packs" className="bg-white px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
          Packs
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-ink-500">
          Pago único. Sin suscripciones, sin sorpresas.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((product) => {
            const highlight = HIGHLIGHTS[product.slug];
            return (
              <div
                key={product.id}
                className={cn(
                  "flex flex-col rounded-2xl border bg-white p-6 shadow-soft",
                  highlight ? "border-amber-500 ring-1 ring-amber-500/30" : "border-ink-100"
                )}
              >
                {highlight && (
                  <span
                    className={cn(
                      "mb-3 w-fit rounded-full px-2.5 py-1 text-xs font-medium",
                      highlight.className
                    )}
                  >
                    {highlight.label}
                  </span>
                )}
                <h3 className="font-display text-base font-semibold text-ink-900">{product.name}</h3>
                <p className="mt-2 font-display text-2xl font-semibold text-ink-900">
                  {formatEuros(product.priceCents)}
                </p>
                <p className="mb-4 text-xs text-ink-500">Pago único</p>
                <ul className="flex-1 space-y-1.5 text-sm text-ink-700">
                  {product.albumCredits > 0 && (
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-success" /> {product.albumCredits} álbum
                      {product.albumCredits !== 1 && "es"} Premium
                    </li>
                  )}
                  {product.nfcCredits > 0 && (
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-success" /> {product.nfcCredits} NFC físico
                      {product.nfcCredits !== 1 && "s"}
                    </li>
                  )}
                  {product.shippingIncluded && product.nfcCredits > 0 && (
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-success" /> Envío incluido
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link href="/tienda" className={cn(buttonVariants({ variant: "outline" }))}>
            Ver todos los packs
          </Link>
        </div>
      </div>
    </section>
  );
}
