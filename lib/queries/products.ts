import { createClient } from "@/lib/supabase/server";
import { categoryForProductType, computeUnitPriceCents } from "@/lib/business/store-products";

export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  albumCredits: number;
  nfcCredits: number;
  photoLimit: number | null;
  videoLimit: number | null;
  storageLimitMb: number | null;
  shippingIncluded: boolean;
  category: "albumes" | "nfc" | "packs";
  /** € por unidad (álbum o NFC) — para señalar honestamente el mejor precio, sin trucos. */
  unitPriceCents: number | null;
};

export async function getStoreProducts(): Promise<StoreProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, description, price_cents, album_credits, nfc_credits, photo_limit, video_limit, storage_limit_mb, shipping_included, type"
    )
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];

  return (data as any[]).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    priceCents: p.price_cents,
    albumCredits: p.album_credits,
    nfcCredits: p.nfc_credits,
    photoLimit: p.photo_limit,
    videoLimit: p.video_limit,
    storageLimitMb: p.storage_limit_mb,
    shippingIncluded: p.shipping_included,
    category: categoryForProductType(p.type),
    unitPriceCents: computeUnitPriceCents(p.price_cents, p.album_credits, p.nfc_credits),
  }));
}
