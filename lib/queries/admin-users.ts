import { requireAdmin } from "@/lib/security/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAlbumOnlyCreditsPurchased, getMySelfNfcTags } from "@/lib/queries/self-nfc";
import { computeSelfNfcQuota } from "@/lib/business/self-nfc-quota";

export type AdminUserRow = {
  id: string;
  fullName: string | null;
  email: string | null;
  emailVerified: boolean;
  role: "user" | "admin";
  isBlocked: boolean;
  albumCount: number;
  createdAt: string;
};

export async function listUsers(): Promise<AdminUserRow[]> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, role, is_blocked, created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  if (!profiles) return [];
  const rows = profiles as any[];

  const [{ data: albumCounts }, usersResult] = await Promise.all([
    admin.from("albums").select("owner_id"),
    Promise.all(rows.map((p) => admin.auth.admin.getUserById(p.id))),
  ]);

  const albumCountByUser = new Map<string, number>();
  for (const row of (albumCounts as any[]) ?? []) {
    albumCountByUser.set(row.owner_id, (albumCountByUser.get(row.owner_id) ?? 0) + 1);
  }

  return rows.map((p, i) => ({
    id: p.id,
    fullName: p.full_name,
    email: usersResult[i]?.data.user?.email ?? null,
    emailVerified: !!usersResult[i]?.data.user?.email_confirmed_at,
    role: p.role,
    isBlocked: p.is_blocked,
    albumCount: albumCountByUser.get(p.id) ?? 0,
    createdAt: p.created_at,
  }));
}

export type AdminUserDetail = AdminUserRow & {
  emailVerified: boolean;
  storageUsedMb: number;
  storageLimitMb: number;
  selfNfcQuota: number;
  selfNfcUsed: number;
  albums: { id: string; title: string; status: string; isPremium: boolean }[];
  orders: {
    id: string;
    totalCents: number;
    status: string;
    createdAt: string;
    isGift: boolean;
    products: { name: string; quantity: number }[];
  }[];
};

export async function getUserDetail(userId: string): Promise<AdminUserDetail | null> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, role, is_blocked, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;
  const p = profile as any;

  const [{ data: authUser }, { data: albums }, ordersRes, albumOnlyCredits, selfNfcTags] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin
      .from("albums")
      .select("id, title, status, is_premium, storage_used_mb, storage_limit_mb")
      .eq("owner_id", userId),
    admin
      .from("orders")
      .select("id, total_cents, status, created_at, is_gift, order_items ( quantity, products ( name ) )")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    getAlbumOnlyCreditsPurchased(userId),
    getMySelfNfcTags(userId),
  ]);

  const albumRows = (albums as any[]) ?? [];
  const storageUsedMb = albumRows.reduce((sum, a) => sum + Number(a.storage_used_mb ?? 0), 0);
  const storageLimitMb = albumRows.reduce((sum, a) => sum + Number(a.storage_limit_mb ?? 0), 0);

  // Si falta la migración 0007 (columna is_gift), esta consulta falla
  // y antes se tragaba el error en silencio, dejando ver "0 pedidos"
  // sin ninguna pista de por qué. Ahora al menos queda en los logs de
  // Vercel/Supabase para poder diagnosticarlo.
  if (ordersRes.error) console.error("getUserDetail: fallo al leer pedidos —", ordersRes.error.message);
  const orders = ordersRes.data;

  return {
    id: p.id,
    fullName: p.full_name,
    email: authUser.user?.email ?? null,
    emailVerified: !!authUser.user?.email_confirmed_at,
    role: p.role,
    isBlocked: p.is_blocked,
    albumCount: albumRows.length,
    createdAt: p.created_at,
    storageUsedMb,
    storageLimitMb,
    selfNfcQuota: computeSelfNfcQuota({ albumOnlyCreditsPurchased: albumOnlyCredits }),
    selfNfcUsed: selfNfcTags.length,
    albums: ((albums as any[]) ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      isPremium: a.is_premium,
    })),
    orders: ((orders as any[]) ?? []).map((o) => ({
      id: o.id,
      totalCents: o.total_cents,
      status: o.status,
      createdAt: o.created_at,
      isGift: !!o.is_gift,
      // spec #13: antes se veía "Regalo" sin decir QUÉ se había
      // regalado — ahora se listan los productos del pedido, igual
      // que ya se hacía en /cuenta para las compras del propio usuario.
      products: (o.order_items ?? []).map((item: any) => ({
        name: item.products?.name ?? "Producto",
        quantity: item.quantity,
      })),
    })),
  };
}
