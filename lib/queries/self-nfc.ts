import { createAdminClient } from "@/lib/supabase/admin";
import { buildNfcUrl } from "@/lib/nfc";

export type SelfNfcRow = { id: string; publicToken: string; url: string; albumId: string | null; createdAt: string };

/**
 * Créditos "de álbum" que cuentan para el cupo de NFC autogenerado
 * (spec #15: regalar un NFC desde el panel de admin tiene que dejar
 * generarlo igual que regalar un álbum). Normalmente solo cuenta un
 * producto de tipo álbum (premium_upgrade/album_pack) — un pack de NFC
 * FÍSICO comprado de verdad no suma cupo extra porque ya trae su
 * propio chip físico. Pero un pedido de REGALO (is_gift) creado a mano
 * desde el panel de admin nunca envía un chip físico de verdad, así
 * que ahí sí debe contar, sea cual sea el producto regalado — si no,
 * un admin que regala "un NFC" deja al usuario sin forma de generarlo.
 */
export async function getAlbumOnlyCreditsPurchased(userId: string): Promise<number> {
  const admin = createAdminClient();

  const { data: orders } = await admin
    .from("orders")
    .select("id, is_gift")
    .eq("user_id", userId)
    .eq("status", "paid");

  const orderRows = (orders as any[]) ?? [];
  const orderIds = orderRows.map((o) => o.id);
  if (orderIds.length === 0) return 0;
  const isGiftByOrder = new Map(orderRows.map((o) => [o.id, !!o.is_gift]));

  const { data: items } = await admin
    .from("order_items")
    .select("order_id, quantity, products ( type, album_credits, nfc_credits )")
    .in("order_id", orderIds);

  let total = 0;
  for (const item of (items as any[]) ?? []) {
    const product = item.products;
    if (!product) continue;
    const isAlbumProduct = product.type === "premium_upgrade" || product.type === "album_pack";
    const isGiftedNonAlbumProduct = isGiftByOrder.get(item.order_id) && !isAlbumProduct;
    if (isAlbumProduct) {
      total += (product.album_credits ?? 0) * item.quantity;
    } else if (isGiftedNonAlbumProduct) {
      // Un NFC (u otro producto) regalado a mano: cuenta como 1 hueco
      // de autogeneración por cada NFC físico que, en teoría, incluía.
      total += Math.max(1, product.nfc_credits ?? 0) * item.quantity;
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
