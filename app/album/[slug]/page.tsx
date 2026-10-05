import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAlbumIdBySlug, getAlbumAuthMeta, getPublicAlbum } from "@/lib/queries/public-album";
import { hasAlbumAccess } from "@/lib/actions/public-album";
import { createClient } from "@/lib/supabase/server";
import { isPastDue } from "@/lib/business/renewal";
import { AlbumViewer } from "@/components/album-viewer/album-viewer";
import { PasswordGate } from "@/components/album-viewer/password-gate";
import { RenewalGate } from "@/components/album-viewer/renewal-gate";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const albumId = await getAlbumIdBySlug(slug);
  if (!albumId) return {};
  const album = await getPublicAlbum(albumId);
  // Los álbumes privados no deben indexarse ni mostrar su título en redes (spec #44).
  if (!album || album.privacy === "private") return { robots: { index: false, follow: false } };
  return { title: album.title, robots: { index: album.status === "published" } };
}

export default async function PublicAlbumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const albumId = await getAlbumIdBySlug(slug);
  if (!albumId) notFound();

  const meta = await getAlbumAuthMeta(albumId);
  if (!meta || meta.status !== "published") notFound();

  if (meta.privacy === "private") {
    const unlocked = await hasAlbumAccess(albumId);
    if (!unlocked) return <PasswordGate mode="slug" identifier={slug} />;
  }

  const album = await getPublicAlbum(albumId);
  if (!album) notFound();

  // Conservación de archivos cada 5 años (spec #10): si ya venció el
  // plazo, se bloquea la vista con un aviso discreto en vez de borrar
  // de golpe — el borrado real, si no se renueva, lo hace el job
  // programado (/api/cron/renewals) pasados 30 días de margen.
  if (album.renewalDueAt && isPastDue(new Date(album.renewalDueAt), new Date())) {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { data: ownerRow } = await supabase.from("albums").select("owner_id").eq("id", albumId).maybeSingle();
    const isOwner = !!userData.user && (ownerRow as any)?.owner_id === userData.user.id;
    return <RenewalGate albumId={albumId} title={album.title} isOwner={isOwner} />;
  }

  return <AlbumViewer album={album} />;
}
