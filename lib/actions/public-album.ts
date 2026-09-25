"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAlbumIdBySlug, getPublicAlbum } from "@/lib/queries/public-album";
import { verifyPassword } from "@/lib/security/password";
import { cookieNameForAlbum, signAlbumAccessToken } from "@/lib/security/album-access";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";

export type UnlockResult = { error: string } | { error?: undefined; ok: true };

export async function unlockAlbumBySlug(slug: string, password: string): Promise<UnlockResult> {
  const albumId = await getAlbumIdBySlug(slug);
  if (!albumId) return { error: "No hemos encontrado ese recuerdo." };
  return unlockAlbum(albumId, password, `/album/${slug}`);
}

export async function unlockAlbumByToken(token: string, password: string): Promise<UnlockResult> {
  return unlockAlbumViaToken(token, password);
}

async function unlockAlbum(albumId: string, password: string, redirectTo: string): Promise<UnlockResult> {
  const ip = await getClientIp();
  const byAlbum = checkRateLimit(`unlock:album:${albumId}`, 15, 15 * 60 * 1000);
  const byIp = checkRateLimit(`unlock:ip:${ip}`, 40, 15 * 60 * 1000);
  if (!byAlbum.allowed || !byIp.allowed) {
    return { error: "Demasiados intentos. Espera unos minutos antes de volver a probar." };
  }

  const album = await getPublicAlbum(albumId);
  if (!album) return { error: "No hemos encontrado ese recuerdo." };

  if (!verifyPassword(password, album.privacyPasswordHash)) {
    return { error: "Esa contraseña no es correcta." };
  }

  const cookieStore = await cookies();
  cookieStore.set(cookieNameForAlbum(albumId), signAlbumAccessToken(albumId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  redirect(redirectTo);
}

async function unlockAlbumViaToken(token: string, password: string): Promise<UnlockResult> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: tag } = await admin.from("nfc_tags").select("album_id").eq("public_token", token).maybeSingle();
  const albumId = (tag as any)?.album_id;
  if (!albumId) return { error: "No hemos encontrado ese recuerdo." };

  return unlockAlbum(albumId, password, `/n/${token}`);
}

/** Usado por las páginas del visor para saber si el visitante ya desbloqueó este álbum. */
export async function hasAlbumAccess(albumId: string): Promise<boolean> {
  const { verifyAlbumAccessToken, cookieNameForAlbum: cookieName } = await import(
    "@/lib/security/album-access"
  );
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName(albumId))?.value;
  return verifyAlbumAccessToken(albumId, token);
}
