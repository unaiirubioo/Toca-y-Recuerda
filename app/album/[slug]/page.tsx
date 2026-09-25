import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAlbumIdBySlug, getAlbumAuthMeta, getPublicAlbum } from "@/lib/queries/public-album";
import { hasAlbumAccess } from "@/lib/actions/public-album";
import { AlbumViewer } from "@/components/album-viewer/album-viewer";
import { PasswordGate } from "@/components/album-viewer/password-gate";

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

  return <AlbumViewer album={album} />;
}
