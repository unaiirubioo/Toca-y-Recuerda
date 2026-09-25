import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProductsTable, type EditableProduct } from "@/components/admin/products-table";
import { FreePlanCard } from "@/components/admin/free-plan-card";
import { getFreePlanLimits } from "@/lib/plans";

export const metadata: Metadata = { title: "Productos · Admin" };

export default async function AdminProductsPage() {
  const supabase = await createClient();
  const [{ data }, freePlan] = await Promise.all([
    supabase
      .from("products")
      .select("id, slug, name, price_cents, album_credits, nfc_credits, photo_limit, video_limit, storage_limit_mb, active")
      .order("sort_order", { ascending: true }),
    getFreePlanLimits(),
  ]);

  const products: EditableProduct[] = ((data as any[]) ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    priceCents: p.price_cents,
    albumCredits: p.album_credits,
    nfcCredits: p.nfc_credits,
    photoLimit: p.photo_limit,
    videoLimit: p.video_limit,
    storageLimitMb: p.storage_limit_mb,
    active: p.active,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 font-display text-2xl font-semibold text-ink-900">Productos</h1>
        <p className="text-sm text-ink-500">
          Cambia precios y límites sin tocar código — se reflejan al momento en la tienda.
        </p>
      </div>
      <FreePlanCard initial={freePlan} />
      <ProductsTable products={products} />
    </div>
  );
}
