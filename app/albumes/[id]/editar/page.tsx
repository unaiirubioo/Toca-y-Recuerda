import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAlbumMedia } from "@/lib/queries/media";
import { getAlbumNfc, getUnassignedNfcCount } from "@/lib/queries/albums";
import { EditAlbumForm, type EditableAlbum } from "@/components/albums/edit-album-form";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = { title: "Editar recuerdo" };

export default async function EditAlbumPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ creando?: string }>;
}) {
  const { id } = await params;
  const { creando } = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const [{ data: album, error }, memoriesRes] = await Promise.all([
    supabase
      .from("albums")
      .select(
        "id, title, description, event_date_start, event_date_end, location_name, location_lat, location_lng, design_theme, design_font, design_layout, music_url, music_title, privacy, status, is_premium, public_slug, cover_media_id, photo_count, video_count, photo_limit, video_limit, storage_used_mb, storage_limit_mb"
      )
      .eq("id", id)
      .single(),
    supabase.from("album_memories").select("content").eq("album_id", id).order("sort_order", { ascending: true }),
  ]);

  // RLS ya impide ver álbumes ajenos: si no aparece, no existe (para este usuario).
  if (error || !album) notFound();

  const a = album as any;
  const editable: EditableAlbum = {
    id: a.id,
    title: a.title,
    eventDateStart: a.event_date_start,
    eventDateEnd: a.event_date_end,
    locationName: a.location_name,
    locationLat: a.location_lat,
    locationLng: a.location_lng,
    designTheme: a.design_theme,
    designFont: a.design_font,
    designLayout: a.design_layout,
    musicUrl: a.music_url,
    musicTitle: a.music_title,
    privacy: a.privacy,
    status: a.status,
    is_premium: a.is_premium,
    public_slug: a.public_slug,
    coverMediaId: a.cover_media_id,
    photoCount: a.photo_count,
    videoCount: a.video_count,
    photoLimit: a.photo_limit,
    videoLimit: a.video_limit,
    storageUsedMb: Number(a.storage_used_mb),
    storageLimitMb: a.storage_limit_mb,
  };

  const initialMemories = ((memoriesRes.data as any[]) ?? []).map((m) => m.content as string);

  const [media, nfc, unassignedNfcCount] = await Promise.all([
    getAlbumMedia(id),
    getAlbumNfc(id),
    getUnassignedNfcCount(userData.user.id),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-cream-100 px-4 py-10">
        <EditAlbumForm
          album={editable}
          media={media}
          nfc={nfc}
          hasUnassignedNfc={unassignedNfcCount > 0}
          initialMemories={initialMemories}
          aiDescription={a.description}
          justCreated={creando === "1"}
        />
      </main>
    </>
  );
}
