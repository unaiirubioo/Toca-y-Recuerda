import { createClient } from "@/lib/supabase/server";

export type FreePlanLimits = {
  maxAlbums: number;
  photoLimit: number;
  videoLimit: number;
  storageLimitMb: number;
};

/** Valor de seguridad si `app_settings` no responde — nunca debe bloquear la creación de álbumes. */
export const DEFAULT_FREE_PLAN: FreePlanLimits = {
  maxAlbums: 1,
  photoLimit: 30,
  videoLimit: 5,
  storageLimitMb: 500,
};

/**
 * Límites del plan gratuito (spec #13), editables desde /admin/productos
 * sin tocar código ni redesplegar — antes vivían en una constante fija,
 * inconsistente con el resto del catálogo (spec #56).
 */
export async function getFreePlanLimits(): Promise<FreePlanLimits> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("value").eq("key", "free_plan").maybeSingle();
  if (!data) return DEFAULT_FREE_PLAN;

  const v = (data as any).value ?? {};
  return {
    maxAlbums: v.maxAlbums ?? DEFAULT_FREE_PLAN.maxAlbums,
    photoLimit: v.photoLimit ?? DEFAULT_FREE_PLAN.photoLimit,
    videoLimit: v.videoLimit ?? DEFAULT_FREE_PLAN.videoLimit,
    storageLimitMb: v.storageLimitMb ?? DEFAULT_FREE_PLAN.storageLimitMb,
  };
}
