import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKET } from "@/lib/storage";

export type AlbumMediaItem = {
  id: string;
  type: "photo" | "video";
  fileName: string;
  sortOrder: number;
  caption: string | null;
  url: string;
  thumbnailUrl: string;
};

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hora — suficiente para una sesión de edición

export async function getAlbumMedia(albumId: string): Promise<AlbumMediaItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("album_media")
    .select("id, type, file_name, storage_path, thumbnail_path, sort_order, caption")
    .eq("album_id", albumId)
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) return [];

  const rows = data as any[];
  const paths = rows.flatMap((r) => [r.storage_path, r.thumbnail_path].filter(Boolean));

  const { data: signedUrls } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  const urlByPath = new Map((signedUrls ?? []).map((s) => [s.path, s.signedUrl]));

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    fileName: r.file_name,
    sortOrder: r.sort_order,
    caption: r.caption,
    url: urlByPath.get(r.storage_path) ?? "",
    thumbnailUrl: urlByPath.get(r.thumbnail_path) ?? urlByPath.get(r.storage_path) ?? "",
  }));
}
