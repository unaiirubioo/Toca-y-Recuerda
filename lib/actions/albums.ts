"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { albumFormSchema, type AlbumFormValues } from "@/lib/validations/albums";
import { getFreePlanLimits } from "@/lib/plans";
import { hashPassword } from "@/lib/security/password";
import { computeAlbumEligibility } from "@/lib/business/album-eligibility";

export type ActionResult = { error: string } | { error?: undefined; albumId?: string };

/**
 * Comprobación PREVIA (no atómica, solo para decidir qué pantalla
 * mostrar): ¿tiene ya un crédito o le queda cupo gratuito? La
 * comprobación real y atómica ocurre dentro de createAlbum, vía RPC.
 */
async function peekEligibility(userId: string) {
  const supabase = await createClient();

  const [{ count: freeAlbumCount }, { count: creditCount }, freePlan] = await Promise.all([
    supabase.from("albums").select("id", { count: "exact", head: true }).eq("owner_id", userId).eq("is_premium", false),
    supabase.from("album_credits").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("consumed", false),
    getFreePlanLimits(),
  ]);

  if ((creditCount ?? 0) > 0) return true;

  const eligibility = computeAlbumEligibility({
    freeAlbumCount: freeAlbumCount ?? 0,
    credit: null,
    freePlanMaxAlbums: freePlan.maxAlbums,
  });
  return eligibility.canCreate;
}

/** Usado por la página del asistente para decidir si mostrar el paso a paso o la pantalla de límite. */
export async function checkCanCreateAlbum(userId: string) {
  return peekEligibility(userId);
}

export async function createAlbum(values: AlbumFormValues, nfcToken?: string | null): Promise<ActionResult> {
  const parsed = albumFormSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del álbum." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  const userId = userData.user.id;

  // Todo lo que sigue toca columnas con privilegios revocados para el
  // usuario normal (is_premium, límites, contadores — ver migración
  // 0005), así que a partir de aquí se trabaja con el cliente admin,
  // ya con la identidad del usuario verificada arriba.
  const admin = createAdminClient();

  // Paso atómico (spec: corrige la condición de carrera de publicar
  // dos veces a la vez): intenta consumir un crédito Premium sin que
  // dos peticiones simultáneas puedan llevarse el mismo.
  const { data: creditRows } = await admin.rpc("try_consume_album_credit", { p_user_id: userId });
  const credit = (creditRows as any[])?.[0] ?? null;

  let limits: { photo_limit: number; video_limit: number; storage_limit_mb: number };
  const usesCredit = !!credit;

  if (credit) {
    limits = {
      photo_limit: credit.photo_limit,
      video_limit: credit.video_limit,
      storage_limit_mb: credit.storage_limit_mb,
    };
  } else {
    const freePlan = await getFreePlanLimits();
    const { count: freeAlbumCount } = await admin
      .from("albums")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .eq("is_premium", false);

    const eligibility = computeAlbumEligibility({
      freeAlbumCount: freeAlbumCount ?? 0,
      credit: null,
      freePlanMaxAlbums: freePlan.maxAlbums,
    });

    if (!eligibility.canCreate) redirect("/albumes/limite");

    limits = {
      photo_limit: freePlan.photoLimit,
      video_limit: freePlan.videoLimit,
      storage_limit_mb: freePlan.storageLimitMb,
    };
  }

  const v = parsed.data;

  // Reintento ante una colisión de slug astronómicamente improbable
  // pero posible (spec: nunca dejar un error genérico sin reintentar).
  let album: { id: string } | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3 && !album; attempt++) {
    const { data, error } = await admin
      .from("albums")
      .insert({
        owner_id: userId,
        public_slug: nanoid(12),
        title: v.title,
        event_date_start: v.eventDateStart || null,
        event_date_end: v.eventDateEnd || null,
        location_name: v.locationName || null,
        location_lat: v.locationLat ?? null,
        location_lng: v.locationLng ?? null,
        design_theme: v.designTheme,
        design_font: v.designFont,
        design_layout: v.designLayout,
        music_url: v.musicUrl || null,
        music_title: v.musicTitle || null,
        privacy: v.privacy,
        privacy_password_hash: v.privacy === "private" && v.privacyPassword ? hashPassword(v.privacyPassword) : null,
        status: "draft",
        is_premium: usesCredit,
        ...limits,
      })
      .select("id")
      .single();

    if (data) album = data;
    else lastError = error;
  }

  if (!album) {
    // No se pudo crear el álbum: si habíamos consumido un crédito, se libera.
    if (credit) await admin.rpc("release_album_credit", { p_credit_id: credit.id });
    console.error("createAlbum: fallo tras reintentos", lastError);
    return { error: "No hemos podido crear el álbum. Inténtalo otra vez." };
  }

  if (credit) {
    await admin.from("album_credits").update({ consumed_by_album_id: album.id }).eq("id", credit.id);
  }

  if (v.memory) {
    await admin.from("album_memories").insert({ album_id: album.id, content: v.memory });
  }

  if (nfcToken) {
    const { data: tag } = await admin
      .from("nfc_tags")
      .select("id, album_id")
      .eq("public_token", nfcToken)
      .maybeSingle();

    // Solo se vincula si el NFC existe y todavía no tiene álbum asignado
    // (spec #50): nunca se sobrescribe un NFC ya asociado a otro recuerdo.
    if (tag && !(tag as any).album_id) {
      await admin
        .from("nfc_tags")
        .update({ album_id: album.id, owner_id: userId, status: "active" })
        .eq("id", (tag as any).id);
    }
  }

  revalidatePath("/dashboard");
  return { albumId: album.id };
}

export async function updateAlbum(albumId: string, values: Partial<AlbumFormValues>): Promise<ActionResult> {
  const parsed = albumFormSchema.partial().safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del álbum." };
  }

  const supabase = await createClient();
  const v = parsed.data;

  const { error } = await supabase
    .from("albums")
    .update({
      ...(v.title !== undefined ? { title: v.title } : {}),
      ...(v.eventDateStart !== undefined ? { event_date_start: v.eventDateStart || null } : {}),
      ...(v.eventDateEnd !== undefined ? { event_date_end: v.eventDateEnd || null } : {}),
      ...(v.locationName !== undefined ? { location_name: v.locationName || null } : {}),
      ...(v.locationLat !== undefined ? { location_lat: v.locationLat } : {}),
      ...(v.locationLng !== undefined ? { location_lng: v.locationLng } : {}),
      ...(v.designTheme !== undefined ? { design_theme: v.designTheme } : {}),
      ...(v.designFont !== undefined ? { design_font: v.designFont } : {}),
      ...(v.designLayout !== undefined ? { design_layout: v.designLayout } : {}),
      ...(v.musicUrl !== undefined ? { music_url: v.musicUrl || null } : {}),
      ...(v.musicTitle !== undefined ? { music_title: v.musicTitle || null } : {}),
      ...(v.privacy !== undefined ? { privacy: v.privacy } : {}),
      ...(v.privacyPassword ? { privacy_password_hash: hashPassword(v.privacyPassword) } : {}),
    })
    // RLS ya impide tocar álbumes ajenos; el filtro es defensa en profundidad.
    // Ninguno de estos campos tiene privilegios de columna revocados:
    // son los datos "de contenido" del propio usuario, no palancas de
    // negocio (planes, límites, estado del NFC).
    .eq("id", albumId);

  if (error) return { error: "No hemos podido guardar los cambios. Inténtalo otra vez." };

  revalidatePath(`/albumes/${albumId}/editar`);
  revalidatePath("/dashboard");
  return {};
}

/**
 * Sustituye por completo los "momentos" (album_memories) de un álbum
 * por la lista dada — permite añadir, editar y quitar varias entradas
 * de texto después de crear el álbum, no solo una vez al principio.
 */
export async function updateAlbumMemories(albumId: string, memories: string[]): Promise<ActionResult> {
  const cleaned = memories.map((m) => m.trim()).filter((m) => m.length > 0);
  if (cleaned.some((m) => m.length > 4000)) {
    return { error: "Cada momento debe tener menos de 4000 caracteres." };
  }

  const supabase = await createClient();

  // RLS (album_memories_owner_all) exige ser el propietario del álbum,
  // así que borrar-y-reinsertar con el cliente normal es seguro.
  const { error: deleteError } = await supabase.from("album_memories").delete().eq("album_id", albumId);
  if (deleteError) return { error: "No hemos podido guardar los momentos. Inténtalo otra vez." };

  if (cleaned.length > 0) {
    const { error: insertError } = await supabase
      .from("album_memories")
      .insert(cleaned.map((content, i) => ({ album_id: albumId, content, sort_order: i })));
    if (insertError) return { error: "No hemos podido guardar los momentos. Inténtalo otra vez." };
  }

  revalidatePath(`/albumes/${albumId}/editar`);
  return {};
}

export async function publishAlbum(albumId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("albums").update({ status: "published" }).eq("id", albumId);
  if (error) return { error: "No hemos podido publicar el álbum. Inténtalo otra vez." };

  revalidatePath("/dashboard");
  redirect(`/albumes/${albumId}/editar`);
}

export async function linkOwnedNfc(albumId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  const userId = userData.user.id;

  // Escritura de nfc_tags.status/album_id: columnas con privilegio
  // revocado para el usuario normal (migración 0005), así que la
  // propia comprobación de propiedad la hace este código de servidor,
  // no RLS — y la escritura va con el cliente admin.
  const admin = createAdminClient();

  const { data: tag } = await admin
    .from("nfc_tags")
    .select("id")
    .eq("owner_id", userId)
    .is("album_id", null)
    .in("status", ["sold", "assigned"])
    .limit(1)
    .maybeSingle();

  if (!tag) return { error: "No tienes ningún NFC pendiente de asociar." };

  // Doble comprobación de propiedad en el propio UPDATE (defensa en profundidad).
  await admin
    .from("nfc_tags")
    .update({ album_id: albumId, status: "active" })
    .eq("id", (tag as any).id)
    .eq("owner_id", userId);

  revalidatePath(`/albumes/${albumId}/editar`);
  return {};
}

/**
 * Vincula un NFC a un álbum escribiendo directamente su código — sin
 * pasar por la tienda ni por escanearlo. Sirve tanto para un NFC que
 * ya tenías comprado y sin asociar, como para uno recién generado en
 * /admin/nfc que todavía está en stock (por ejemplo, mientras pruebas
 * la plataforma tú mismo). Si el NFC ya pertenece a otra persona, se
 * rechaza — nunca se "roba" un NFC ajeno.
 */
export async function linkNfcByToken(albumId: string, rawToken: string): Promise<ActionResult> {
  const token = rawToken.trim();
  if (!token) return { error: "Escribe el código del NFC." };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  const userId = userData.user.id;

  const admin = createAdminClient();

  const { data: tag } = await admin
    .from("nfc_tags")
    .select("id, owner_id, album_id")
    .eq("public_token", token)
    .maybeSingle();

  if (!tag) return { error: "No hemos encontrado ningún NFC con ese código." };
  const t = tag as any;

  if (t.album_id) return { error: "Ese NFC ya está asociado a otro álbum." };
  if (t.owner_id && t.owner_id !== userId) return { error: "Ese NFC ya pertenece a otra cuenta." };

  await admin
    .from("nfc_tags")
    .update({ album_id: albumId, owner_id: userId, status: "active" })
    .eq("id", t.id);

  revalidatePath(`/albumes/${albumId}/editar`);
  return {};
}

export async function unlinkNfc(albumId: string): Promise<void> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const admin = createAdminClient();

  // El NFC sigue siendo suyo (queda "vendido" y disponible para
  // asociarlo a otro álbum); solo deja de apuntar a este. El filtro
  // por owner_id es la comprobación de propiedad real ahora que la
  // columna no es escribible por el usuario vía RLS+grants.
  await admin
    .from("nfc_tags")
    .update({ album_id: null, status: "sold" })
    .eq("album_id", albumId)
    .eq("owner_id", userData.user.id);

  revalidatePath(`/albumes/${albumId}/editar`);
}

export async function deleteAlbum(albumId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("albums").delete().eq("id", albumId);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// Se usa desde el panel /admin. Necesita el cliente admin porque puede
// borrar álbumes de cualquier usuario, no solo los propios.
export async function adminForceDeleteAlbum(albumId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("albums").delete().eq("id", albumId);
}
