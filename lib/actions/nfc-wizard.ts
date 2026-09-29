"use server";

import { createClient } from "@/lib/supabase/server";
import { getUnassignedNfcList } from "@/lib/queries/albums";

/** Para el paso "¿Asociar NFC?" del asistente: lista los NFC propios sin usar. */
export async function listMyUnassignedNfcForWizard() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];
  return getUnassignedNfcList(userData.user.id);
}
