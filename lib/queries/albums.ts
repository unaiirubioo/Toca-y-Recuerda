import { createClient } from "@/lib/supabase/server";

export type DashboardAlbum = {
  id: string;
  title: string;
  event_date_start: string | null;
  status: "draft" | "published";
  is_premium: boolean;
  photo_count: number;
  video_count: number;
  storage_used_mb: number;
  storage_limit_mb: number;
  cover_media_id: string | null;
  nfc_public_token: string | null;
};

/**
 * Álbumes del usuario para el dashboard, con el NFC asociado (si lo hay).
 * Se pide explícitamente owner_id = user.id aunque RLS ya lo garantiza:
 * es defensa en profundidad, nunca confiar en una sola capa (spec #45).
 */
export async function getUserAlbums(userId: string): Promise<DashboardAlbum[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("albums")
    .select(
      `
      id, title, event_date_start, status, is_premium,
      photo_count, video_count, storage_used_mb, storage_limit_mb, cover_media_id,
      nfc_tags ( public_token )
      `
    )
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as any[]).map((album) => ({
    id: album.id,
    title: album.title,
    event_date_start: album.event_date_start,
    status: album.status,
    is_premium: album.is_premium,
    photo_count: album.photo_count,
    video_count: album.video_count,
    storage_used_mb: Number(album.storage_used_mb),
    storage_limit_mb: album.storage_limit_mb,
    cover_media_id: album.cover_media_id,
    nfc_public_token: album.nfc_tags?.[0]?.public_token ?? null,
  }));
}

/** NFC ya comprados (propiedad del usuario) que todavía no están asociados a ningún álbum. */
export async function getUnassignedNfcCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("nfc_tags")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId)
    .is("album_id", null)
    .in("status", ["sold", "assigned"]);
  return count ?? 0;
}

/** El NFC asociado a un álbum concreto, si lo hay (spec #50/#51). */
export async function getAlbumNfc(albumId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("nfc_tags")
    .select("id, public_token, status")
    .eq("album_id", albumId)
    .maybeSingle();
  return data as { id: string; public_token: string; status: string } | null;
}

/** Créditos de álbum Premium y de NFC todavía no consumidos (spec #58/#59). */
export async function getAvailableCredits(userId: string) {  const supabase = await createClient();

  const [albumCredits, nfcCredits] = await Promise.all([
    supabase
      .from("album_credits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("consumed", false),
    supabase
      .from("nfc_credits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("consumed", false),
  ]);

  return {
    albumCredits: albumCredits.count ?? 0,
    nfcCredits: nfcCredits.count ?? 0,
  };
}
