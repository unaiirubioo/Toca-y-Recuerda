import type { Metadata } from "next";
import { getStoreProducts, type StoreProduct } from "@/lib/queries/products";
import { bestValueId } from "@/lib/business/store-products";
import { ProductCard } from "@/components/store/product-card";
import { CartBadge } from "@/components/store/cart-badge";

export const metadata: Metadata = { title: "Tienda" };

const SECTIONS: { key: StoreProduct["category"]; title: string; subtitle: string }[] = [
  { key: "albumes", title: "Álbumes", subtitle: "Desbloquea más espacio para tus recuerdos." },
  { key: "nfc", title: "NFC", subtitle: "El objeto físico que abre tu álbum al acercar el móvil." },
  { key: "packs", title: "Packs completos", subtitle: "NFC + álbum Premium, todo en uno." },
];

export default async function StorePage() {
  const products = await getStoreProducts();

  return (
    <main className="min-h-screen bg-cream-100 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-12">
        <div className="text-center">
          <h1 className="font-display text-3xl font-semibold text-ink-900">Tienda</h1>
          <p className="mt-2 text-ink-500">Todo pago único. Nada de suscripciones.</p>
        </div>

        {SECTIONS.map((section) => {
          const items = products.filter((p) => p.category === section.key);
          if (items.length === 0) return null;
          const bestId = bestValueId(items);

          return (
            <section key={section.key}>
              <h2 className="font-display text-xl font-semibold text-ink-900">{section.title}</h2>
              <p className="mb-5 text-sm text-ink-500">{section.subtitle}</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((product) => (
                  <ProductCard key={product.id} product={product} isBestValue={product.id === bestId} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <CartBadge />
    </main>
  );
}
