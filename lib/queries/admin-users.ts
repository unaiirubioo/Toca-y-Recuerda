import { requireAdmin } from "@/lib/security/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminUserRow = {
  id: string;
  fullName: string | null;
  email: string | null;
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
    role: p.role,
    isBlocked: p.is_blocked,
    albumCount: albumCountByUser.get(p.id) ?? 0,
    createdAt: p.created_at,
  }));
}

export type AdminUserDetail = AdminUserRow & {
  albums: { id: string; title: string; status: string; isPremium: boolean }[];
  orders: { id: string; totalCents: number; status: string; createdAt: string; isGift: boolean }[];
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

  const [{ data: authUser }, { data: albums }, ordersRes] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin.from("albums").select("id, title, status, is_premium").eq("owner_id", userId),
    admin.from("orders").select("id, total_cents, status, created_at, is_gift").eq("user_id", userId),
  ]);

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
    role: p.role,
    isBlocked: p.is_blocked,
    albumCount: (albums as any[])?.length ?? 0,
    createdAt: p.created_at,
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
    })),
  };
}
