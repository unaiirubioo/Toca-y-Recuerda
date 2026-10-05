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

export async function updateProduct(
  productId: string,
  fields: {
    priceCents: number;
    albumCredits: number;
    nfcCredits: number;
    photoLimit: number | null;
    videoLimit: number | null;
    storageLimitMb: number | null;
    active: boolean;
  }
): Promise<{ error: string } | { ok: true }> {
  await assertAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("products")
    .update({
      price_cents: fields.priceCents,
      album_credits: fields.albumCredits,
      nfc_credits: fields.nfcCredits,
      photo_limit: fields.photoLimit,
      video_limit: fields.videoLimit,
      storage_limit_mb: fields.storageLimitMb,
      active: fields.active,
    })
    .eq("id", productId);

  if (error) return { error: "No hemos podido guardar los cambios." };

  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
  return { ok: true };
}
