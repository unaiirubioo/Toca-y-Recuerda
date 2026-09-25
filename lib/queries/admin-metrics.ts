import { createAdminClient } from "@/lib/supabase/admin";

export type AdminMetrics = {
  totalUsers: number;
  totalAlbums: number;
  freeAlbums: number;
  premiumAlbums: number;
  totalRevenueCents: number;
  nfcByStatus: Record<string, number>;
  totalStorageMb: number;
};

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const admin = createAdminClient();

  const [{ count: totalUsers }, albumsRes, { data: payments }, { data: nfcRows }] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("albums").select("is_premium, storage_used_mb"),
    admin.from("payments").select("amount_cents").eq("status", "succeeded"),
    admin.from("nfc_tags").select("status"),
  ]);

  const albums = (albumsRes.data as any[]) ?? [];
  const freeAlbums = albums.filter((a) => !a.is_premium).length;
  const premiumAlbums = albums.filter((a) => a.is_premium).length;
  const totalStorageMb = albums.reduce((sum, a) => sum + Number(a.storage_used_mb ?? 0), 0);

  const totalRevenueCents = ((payments as any[]) ?? []).reduce((sum, p) => sum + p.amount_cents, 0);

  const nfcByStatus: Record<string, number> = {};
  for (const row of (nfcRows as any[]) ?? []) {
    nfcByStatus[row.status] = (nfcByStatus[row.status] ?? 0) + 1;
  }

  return {
    totalUsers: totalUsers ?? 0,
    totalAlbums: albums.length,
    freeAlbums,
    premiumAlbums,
    totalRevenueCents,
    nfcByStatus,
    totalStorageMb,
  };
}
