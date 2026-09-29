import { createAdminClient } from "@/lib/supabase/admin";
import { buildNfcUrl } from "@/lib/nfc";

export type SelfNfcRow = { id: string; publicToken: string; url: string; albumId: string | null; createdAt: string };

/** Créditos de álbum comprados SOLO como álbum (sin NFC físico incluido), ya pagados. */
export async function getAlbumOnlyCreditsPurchased(userId: string): Promise<number> {
  const admin = createAdminClient();

  const { data: orders } = await admin
    .from("orders")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "paid");

  const orderIds = ((orders as any[]) ?? []).map((o) => o.id);
  if (orderIds.length === 0) return 0;

  const { data: items } = await admin
    .from("order_items")
    .select("quantity, products ( type, album_credits )")
    .in("order_id", orderIds);

  let total = 0;
  for (const item of (items as any[]) ?? []) {
    const product = item.products;
    if (!product) continue;
    if (product.type === "premium_upgrade" || product.type === "album_pack") {
      total += (product.album_credits ?? 0) * item.quantity;
    }
  }
  return total;
}

export async function getMySelfNfcTags(userId: string): Promise<SelfNfcRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("nfc_tags")
    .select("id, public_token, album_id, created_at")
    .eq("owner_id", userId)
    .eq("self_generated", true)
    .order("created_at", { ascending: false });

  return ((data as any[]) ?? []).map((r) => ({
    id: r.id,
    publicToken: r.public_token,
    url: buildNfcUrl(r.public_token),
    albumId: r.album_id,
    createdAt: r.created_at,
  }));
}
