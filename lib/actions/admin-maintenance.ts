"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("No autenticado.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
  if ((profile as any)?.role !== "admin") throw new Error("No autorizado.");
}

/**
 * Recalcula photo_count/video_count/storage_used_mb de TODOS los
 * álbumes a partir de album_media real — corrige la deriva que pueden
 * ir acumulando los contadores incrementales tras cualquier fallo a
 * medias (spec: fragilidad de datos).
 */
export async function recalculateAllCounters(): Promise<{ error: string } | { ok: true }> {
  await assertAdmin();
  const admin = createAdminClient();

  const { error } = await admin.rpc("recalculate_all_album_counters");
  if (error) return { error: "No hemos podido recalcular los contadores." };

  revalidatePath("/admin");
  revalidatePath("/admin/albumes");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateFreePlanSettings(fields: {
  maxAlbums: number;
  photoLimit: number;
  videoLimit: number;
  storageLimitMb: number;
}): Promise<{ error: string } | { ok: true }> {
  await assertAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("app_settings")
    .update({ value: fields })
    .eq("key", "free_plan");

  if (error) return { error: "No hemos podido guardar el plan gratuito." };

  revalidatePath("/admin/productos");
  return { ok: true };
}
