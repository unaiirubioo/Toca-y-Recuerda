import { createAdminClient } from "@/lib/supabase/admin";

export type AdminAlbumRow = {
  id: string;
  title: string;
  status: "draft" | "published";
  isPremium: boolean;
  ownerName: string | null;
  ownerId: string;
  storageUsedMb: number;
  storageLimitMb: number;
  createdAt: string;
};

export async function listAllAlbums(): Promise<AdminAlbumRow[]> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("albums")
    .select("id, title, status, is_premium, owner_id, storage_used_mb, storage_limit_mb, created_at, profiles ( full_name )")
    .order("created_at", { ascending: false })
    .limit(300);

  return ((data as any[]) ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    status: a.status,
    isPremium: a.is_premium,
    ownerName: a.profiles?.full_name ?? null,
    ownerId: a.owner_id,
    storageUsedMb: Number(a.storage_used_mb),
    storageLimitMb: a.storage_limit_mb,
    createdAt: a.created_at,
  }));
}
