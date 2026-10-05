"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  STORAGE_BUCKET,
  MAX_PHOTO_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  buildMediaPath,
  buildThumbnailPath,
  bytesToMb,
} from "@/lib/storage";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { exceedsCountLimit, exceedsStorageLimit } from "@/lib/business/media-limits";

type UploadSlotResult =
  | { error: string }
  | {
      mediaId: string;
      path: string;
      thumbnailPath: string;
      token: string;
      signedUrl: string;
      thumbnailToken: string;
      thumbnailSignedUrl: string;
    };

/**
 * Paso 1 de la subida: comprobación PREVIA de límites (spec #10) y
 * generación de una URL firmada para que el navegador suba el archivo
 * directamente a Supabase Storage (sin pasar por el servidor de Next.js,
 * evitando límites de tamaño de las Server Actions).
 *
 * Esta comprobación es "optimista": la comprobación definitiva ocurre en
 * confirmMediaUpload, después de subir, para evitar condiciones de carrera
 * si el usuario sube muchos archivos a la vez.
 *
 * Lee el álbum con el cliente normal a propósito: si no es el
 * propietario, RLS ya devuelve vacío aquí — es la comprobación de
 * propiedad, sin necesidad del cliente admin todavía (no se escribe
 * nada sensible en este paso).
 */
export async function createUploadSlot(
  albumId: string,
  file: { name: string; size: number; type: "photo" | "video" }
): Promise<UploadSlotResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Tu sesión ha caducado. Inicia sesión otra vez." };

  const limit = checkRateLimit(`upload:${userData.user.id}`, 120, 60 * 60 * 1000);
  if (!limit.allowed) {
    return { error: "Has subido muchos archivos en poco tiempo. Espera un momento e inténtalo otra vez." };
  }

  const maxSize = file.type === "photo" ? MAX_PHOTO_SIZE_BYTES : MAX_VIDEO_SIZE_BYTES;
  if (file.size > maxSize) {
    return {
      error: `Ese archivo pesa demasiado (máximo ${Math.round(maxSize / (1024 * 1024))} MB).`,
    };
  }

  const { data: album, error: albumError } = await supabase
    .from("albums")
    .select("photo_limit, video_limit, storage_limit_mb, storage_used_mb, photo_count, video_count")
    .eq("id", albumId)
    .single();

  if (albumError || !album) return { error: "No hemos encontrado ese álbum." };

  const a = album as any;
  const usage = {
    photoCount: a.photo_count,
    videoCount: a.video_count,
    photoLimit: a.photo_limit,
    videoLimit: a.video_limit,
    storageUsedMb: Number(a.storage_used_mb),
    storageLimitMb: a.storage_limit_mb,
  };
  if (exceedsCountLimit(file.type, usage)) {
    return { error: `Has llegado al límite de ${file.type === "photo" ? "fotos" : "vídeos"} de este álbum.` };
  }
  if (exceedsStorageLimit(usage, bytesToMb(file.size))) {
    return { error: "Has llegado al límite de almacenamiento de este álbum." };
  }

  const mediaId = nanoid(16);
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = buildMediaPath(albumId, mediaId, ext);
  const thumbnailPath = buildThumbnailPath(albumId, mediaId);

  const [{ data: signed, error: signedError }, { data: thumbSigned, error: thumbError }] = await Promise.all([
    supabase.storage.from(STORAGE_BUCKET).createSignedUploadUrl(path),
    supabase.storage.from(STORAGE_BUCKET).createSignedUploadUrl(thumbnailPath),
  ]);

  if (signedError || thumbError || !signed || !thumbSigned) {
    return { error: "No hemos podido preparar la subida. Inténtalo otra vez." };
  }

  return {
    mediaId,
    path,
    thumbnailPath,
    token: signed.token,
    signedUrl: signed.signedUrl,
    thumbnailToken: thumbSigned.token,
    thumbnailSignedUrl: thumbSigned.signedUrl,
  };
}

export async function confirmMediaUpload(
  albumId: string,
  media: {
    mediaId: string;
    type: "photo" | "video";
    storagePath: string;
    thumbnailPath: string;
    fileName: string;
    sizeBytes: number;
    width?: number;
    height?: number;
    durationSeconds?: number;
    // Resultado del análisis hecho gratis en el navegador de quien sube
    // el archivo (ver lib/ai/client-vision.ts) — nunca obligatorio: si
    // falta (análisis fallido, navegador sin soporte), se guarda sin
    // ello y el álbum se crea igual.
    takenAt?: string;
    lat?: number;
    lng?: number;
    phash?: string;
    blurScore?: number;
    tags?: string[];
  }
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient();

  // Lectura con el cliente normal: RLS ya garantiza que solo se ve el
  // álbum si es el propietario — es la comprobación de propiedad.
  const { data: album } = await supabase
    .from("albums")
    .select("photo_limit, video_limit, storage_limit_mb, storage_used_mb, photo_count, video_count, cover_media_id")
    .eq("id", albumId)
    .single();

  if (!album) return { error: "No hemos encontrado ese álbum." };

  const a = album as any;
  const sizeMb = bytesToMb(media.sizeBytes);
  const usage = {
    photoCount: a.photo_count,
    videoCount: a.video_count,
    photoLimit: a.photo_limit,
    videoLimit: a.video_limit,
    storageUsedMb: Number(a.storage_used_mb),
    storageLimitMb: a.storage_limit_mb,
  };
  // Revalidación DEFINITIVA de límites (spec #10): nunca confiar en que
  // el paso anterior sigue siendo válido, sobre todo con subidas en paralelo.
  const exceedsCount = exceedsCountLimit(media.type, usage);
  const exceedsStorage = exceedsStorageLimit(usage, sizeMb);

  if (exceedsCount || exceedsStorage) {
    // Limpiamos lo ya subido para no dejar basura ocupando cuota.
    await supabase.storage.from(STORAGE_BUCKET).remove([media.storagePath, media.thumbnailPath]);
    return { error: "Has llegado al límite de tu álbum. Este archivo no se ha guardado." };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("album_media")
    .insert({
      // Sin "id" explícito: la columna es uuid y `media.mediaId` es un
      // nanoid (identificador solo para las rutas de Storage, no un
      // UUID) — forzarlo aquí hacía fallar el insert siempre, con este
      // mismo mensaje genérico. Postgres genera el UUID real solo.
      album_id: albumId,
      type: media.type,
      storage_path: media.storagePath,
      thumbnail_path: media.thumbnailPath,
      file_name: media.fileName,
      size_bytes: media.sizeBytes,
      width: media.width ?? null,
      height: media.height ?? null,
      duration_seconds: media.durationSeconds ?? null,
      taken_at: media.takenAt ?? null,
      phash: media.phash ?? null,
      blur_score: media.blurScore ?? null,
      tags: media.tags ?? [],
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("confirmMediaUpload: fallo al insertar album_media", insertError);
    await supabase.storage.from(STORAGE_BUCKET).remove([media.storagePath, media.thumbnailPath]);
    return { error: "No hemos podido guardar esta foto. Inténtalo otra vez." };
  }

  const newMediaId = (inserted as any).id as string;

  // storage_used_mb/photo_count/video_count tienen el privilegio de
  // columna revocado para el usuario normal (migración 0005) — la
  // propiedad ya se comprobó arriba con el cliente normal, así que
  // aquí usamos el cliente admin solo para esta escritura concreta.
  const admin = createAdminClient();
  await admin
    .from("albums")
    .update({
      storage_used_mb: Number(a.storage_used_mb) + sizeMb,
      ...(media.type === "photo" ? { photo_count: a.photo_count + 1 } : { video_count: a.video_count + 1 }),
      ...(!a.cover_media_id && media.type === "photo" ? { cover_media_id: newMediaId } : {}),
    })
    .eq("id", albumId);

  revalidatePath(`/albumes/${albumId}/editar`);
  return { ok: true };
}

export async function deleteMedia(albumId: string, mediaId: string): Promise<void> {
  const supabase = await createClient();

  // Lectura con el cliente normal: si no es el propietario, RLS ya
  // devuelve nada y la función termina aquí sin tocar nada.
  const { data: mediaRow } = await supabase
    .from("album_media")
    .select("storage_path, thumbnail_path, type, size_bytes")
    .eq("id", mediaId)
    .single();

  if (!mediaRow) return;
  const m = mediaRow as any;

  await supabase.storage.from(STORAGE_BUCKET).remove([m.storage_path, m.thumbnail_path].filter(Boolean));
  await supabase.from("album_media").delete().eq("id", mediaId);

  const { data: album } = await supabase
    .from("albums")
    .select("storage_used_mb, photo_count, video_count, cover_media_id")
    .eq("id", albumId)
    .single();

  if (!album) return;
  const a = album as any;
  const wasCover = a.cover_media_id === mediaId;

  // Si la foto borrada era la portada, se reasigna automáticamente a
  // otra foto que quede en el álbum (antes el álbum se quedaba sin
  // portada sin que nadie lo arreglara).
  let newCoverMediaId: string | null = a.cover_media_id;
  if (wasCover) {
    const { data: nextCover } = await supabase
      .from("album_media")
      .select("id")
      .eq("album_id", albumId)
      .eq("type", "photo")
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    newCoverMediaId = (nextCover as any)?.id ?? null;
  }

  // Cliente admin solo para esta escritura (columnas con privilegio revocado).
  const admin = createAdminClient();
  await admin
    .from("albums")
    .update({
      storage_used_mb: Math.max(0, Number(a.storage_used_mb) - bytesToMb(m.size_bytes)),
      ...(m.type === "photo"
        ? { photo_count: Math.max(0, a.photo_count - 1) }
        : { video_count: Math.max(0, a.video_count - 1) }),
      cover_media_id: newCoverMediaId,
    })
    .eq("id", albumId);

  revalidatePath(`/albumes/${albumId}/editar`);
}

export async function setCoverMedia(albumId: string, mediaId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Comprobación de propiedad con el cliente normal (RLS): si el álbum
  // no es del usuario, no seguimos. Antes esto comprobaba ADEMÁS que
  // mediaId perteneciera a albumId con una consulta aparte — una
  // comprobación extra que acabó siendo demasiado frágil (por ejemplo,
  // justo después de subir una foto, o tras reordenar) y producía
  // falsos "esa foto ya no está en este álbum" con fotos que sí
  // estaban. La restricción de clave foránea de la base de datos ya
  // garantiza que no se puede poner como portada un id que no exista.
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Tu sesión ha caducado. Inicia sesión otra vez." };

  const { data: album } = await supabase.from("albums").select("id, owner_id").eq("id", albumId).maybeSingle();
  if (!album) return { error: "No hemos encontrado ese álbum." };

  // La escritura se hace con el cliente admin a propósito: así evitamos
  // depender de que la política RLS de UPDATE se comporte exactamente
  // como se espera en todos los casos — la propiedad ya ha quedado
  // comprobada arriba con el cliente normal.
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { error } = await admin.from("albums").update({ cover_media_id: mediaId }).eq("id", albumId);
  if (error) {
    console.error("setCoverMedia:", error.code, error.message, error.details, error.hint);
    if (error.code === "23503") {
      // Violación de clave foránea: ese mediaId de verdad no existe (ya
      // se borró, por ejemplo) — este sí es un mensaje honesto.
      return { error: "Esa foto ya no está en este álbum. Recarga la página e inténtalo otra vez." };
    }
    return { error: "No hemos podido poner esa foto como portada. Inténtalo otra vez." };
  }
  revalidatePath(`/albumes/${albumId}/editar`);
  revalidatePath("/dashboard");
  return {};
}

export async function reorderMedia(items: { id: string; sort_order: number }[]): Promise<void> {
  const supabase = await createClient();
  await Promise.all(
    items.map((item) => supabase.from("album_media").update({ sort_order: item.sort_order }).eq("id", item.id))
  );
}

/** Descripción de una foto/vídeo (spec: el campo `caption` existía en la base de datos pero no se podía editar). */
export async function updateMediaCaption(mediaId: string, caption: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("album_media")
    .update({ caption: caption.trim().slice(0, 500) || null })
    .eq("id", mediaId);
  if (error) {
    console.error("updateMediaCaption:", error.code, error.message);
    return { error: "No hemos podido guardar la descripción. Inténtalo otra vez." };
  }
  return {};
}
