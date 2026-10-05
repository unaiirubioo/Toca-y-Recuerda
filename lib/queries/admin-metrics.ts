import { requireAdmin } from "@/lib/security/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminMetrics = {
  totalUsers: number;

  totalAlbums: number;
  freeAlbums: number;
  premiumAlbums: number;

  // spec #11: el NFC autogenerado gratis nunca debe contar como "vendido".
  totalNfc: number;
  freeNfc: number;
  purchasedNfc: number;

  revenueAlbumsCents: number;
  revenueNfcCents: number;
  totalRevenueCents: number;

  nfcByStatus: Record<string, number>;
  totalStorageMb: number;
};

export async function getAdminMetrics(): Promise<AdminMetrics> {
  await requireAdmin();
  const admin = createAdminClient();

  const [{ count: totalUsers }, albumsRes, nfcRes, paidOrdersRes] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("albums").select("is_premium, storage_used_mb"),
    admin.from("nfc_tags").select("status, self_generated"),
    // Pedidos de verdad pagados — un regalo de un admin vale 0 € y no
    // debe sumar a los ingresos (spec #11), igual que antes no sumaba a
    // "payments". Se piden solo los no-regalo, en vez de filtrar luego
    // en memoria, para no tener que traer también los de regalo.
    admin.from("orders").select("id").eq("status", "paid").eq("is_gift", false),
  ]);

  // Si esto muestra 0/0 de forma persistente aun teniendo álbumes de
  // verdad, el error real queda aquí en los logs — antes se perdía en
  // silencio y parecía simplemente "un dato mal calculado".
  if (albumsRes.error) console.error("getAdminMetrics: fallo al leer albums —", albumsRes.error.message);
  if (paidOrdersRes.error) console.error("getAdminMetrics: fallo al leer orders —", paidOrdersRes.error.message);

  const paidOrderIds = ((paidOrdersRes.data as any[]) ?? []).map((o) => o.id);
  const orderItemsRes = paidOrderIds.length
    ? await admin
        .from("order_items")
        .select("quantity, unit_price_cents, products ( type )")
        .in("order_id", paidOrderIds)
    : { data: [] as any[], error: null };
  if (orderItemsRes.error) console.error("getAdminMetrics: fallo al leer order_items —", orderItemsRes.error.message);

  const albums = (albumsRes.data as any[]) ?? [];
  const freeAlbums = albums.filter((a) => !a.is_premium).length;
  const premiumAlbums = albums.filter((a) => a.is_premium).length;
  const totalStorageMb = albums.reduce((sum, a) => sum + Number(a.storage_used_mb ?? 0), 0);

  const nfcRows = (nfcRes.data as any[]) ?? [];
  // "Vendido" de verdad = no está en stock y NO se autogeneró gratis.
  // Antes, un NFC autogenerado por un usuario con su álbum gratuito
  // contaba igual que uno comprado de verdad, inflando "NFC vendidos".
  const purchasedNfc = nfcRows.filter((n) => n.status !== "stock" && !n.self_generated).length;
  const freeNfc = nfcRows.filter((n) => n.self_generated).length;

  const nfcByStatus: Record<string, number> = {};
  for (const row of nfcRows) {
    nfcByStatus[row.status] = (nfcByStatus[row.status] ?? 0) + 1;
  }

  let revenueAlbumsCents = 0;
  let revenueNfcCents = 0;
  for (const item of (orderItemsRes.data as any[]) ?? []) {
    const amount = (item.unit_price_cents ?? 0) * (item.quantity ?? 1);
    const type = item.products?.type;
    if (type === "nfc_pack") {
      revenueNfcCents += amount;
    } else {
      // premium_upgrade, album_pack y combo_pack se cuentan como
      // "ingresos por álbumes" — un combo también incluye NFC físico,
      // pero su producto principal es desbloquear el álbum.
      revenueAlbumsCents += amount;
    }
  }

  return {
    totalUsers: totalUsers ?? 0,

    totalAlbums: albums.length,
    freeAlbums,
    premiumAlbums,

    totalNfc: nfcRows.length,
    freeNfc,
    purchasedNfc,

    revenueAlbumsCents,
    revenueNfcCents,
    totalRevenueCents: revenueAlbumsCents + revenueNfcCents,

    nfcByStatus,
    totalStorageMb,
  };
}
