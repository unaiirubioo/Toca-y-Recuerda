import { createAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKET } from "@/lib/storage";

export type PublicAlbum = {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  privacy: "public" | "private";
  privacyPasswordHash: string | null;
  eventDateStart: string | null;
  eventDateEnd: string | null;
  locationName: string | null;
  locationLat: number | null;
  locationLng: number | null;
  designTheme: string;
  designLayout: string;
  musicUrl: string | null;
  musicTitle: string | null;
  coverUrl: string | null;
  media: { id: string; type: "photo" | "video"; url: string; thumbnailUrl: string }[];
  memories: string[];
};

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 6; // 6 horas: dura una visita larga sin regenerarse

/** Trae los campos mínimos para decidir autorización sin exponer datos de más. */
export async function getAlbumAuthMeta(albumId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("albums")
    .select("id, status, privacy")
    .eq("id", albumId)
    .maybeSingle();
  return data as { id: string; status: "draft" | "published"; privacy: "public" | "private" } | null;
}

export async function getAlbumIdBySlug(slug: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("albums").select("id").eq("public_slug", slug).maybeSingle();
  return (data as any)?.id ?? null;
}

export async function getPublicAlbum(albumId: string): Promise<PublicAlbum | null> {
  const admin = createAdminClient();

  const { data: album } = await admin
    .from("albums")
    .select(
      "id, title, description, status, privacy, privacy_password_hash, event_date_start, event_date_end, location_name, location_lat, location_lng, design_theme, design_layout, music_url, music_title, cover_media_id"
    )
    .eq("id", albumId)
    .maybeSingle();

  if (!album) return null;
  const a = album as any;

  const [{ data: mediaRows }, { data: memoryRows }] = await Promise.all([
    admin
      .from("album_media")
      .select("id, type, storage_path, thumbnail_path")
      .eq("album_id", albumId)
      .order("sort_order", { ascending: true }),
    admin.from("album_memories").select("content").eq("album_id", albumId).order("sort_order"),
  ]);

  const rows = (mediaRows ?? []) as any[];
  const paths = rows.flatMap((r) => [r.storage_path, r.thumbnail_path].filter(Boolean));

  const { data: signedUrls } = paths.length
    ? await admin.storage.from(STORAGE_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
    : { data: [] as { path: string; signedUrl: string }[] };

  const urlByPath = new Map((signedUrls ?? []).map((s) => [s.path, s.signedUrl]));

  const media = rows.map((r) => ({
    id: r.id as string,
    type: r.type as "photo" | "video",
    url: urlByPath.get(r.storage_path) ?? "",
    thumbnailUrl: urlByPath.get(r.thumbnail_path) ?? urlByPath.get(r.storage_path) ?? "",
  }));

  const cover = rows.find((r) => r.id === a.cover_media_id);
  const coverUrl = cover ? urlByPath.get(cover.storage_path) ?? null : media[0]?.url ?? null;

  return {
    id: a.id,
    title: a.title,
    description: a.description,
    status: a.status,
    privacy: a.privacy,
    privacyPasswordHash: a.privacy_password_hash,
    eventDateStart: a.event_date_start,
    eventDateEnd: a.event_date_end,
    locationName: a.location_name,
    locationLat: a.location_lat,
    locationLng: a.location_lng,
    designTheme: a.design_theme,
    designLayout: a.design_layout,
    musicUrl: a.music_url,
    musicTitle: a.music_title,
    coverUrl,
    media,
    memories: (memoryRows ?? []).map((m: any) => m.content as string),
  };
}
