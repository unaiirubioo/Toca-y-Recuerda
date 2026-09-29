"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateNfcToken, buildNfcUrl } from "@/lib/nfc";
import { canGenerateSelfNfc } from "@/lib/business/self-nfc-quota";
import { getAlbumOnlyCreditsPurchased, getMySelfNfcTags } from "@/lib/queries/self-nfc";

export type GenerateSelfNfcResult = { error: string } | { error?: undefined; token: string; url: string };

/**
 * Genera un NFC propio para el usuario desde Ajustes de su cuenta
 * (spec: usuarios que solo compran el álbum y quieren configurar ellos
 * mismos su etiqueta NFC, sin depender de que nosotros les enviemos
 * una física). Respeta el cupo: 1 gratis + 1 por cada álbum comprado
 * sin NFC físico incluido.
 */
export async function generateMySelfNfc(): Promise<GenerateSelfNfcResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Tienes que iniciar sesión." };
  const userId = userData.user.id;

  const [albumOnlyCredits, existing] = await Promise.all([
    getAlbumOnlyCreditsPurchased(userId),
    getMySelfNfcTags(userId),
  ]);

  if (!canGenerateSelfNfc({ albumOnlyCreditsPurchased: albumOnlyCredits, alreadyGenerated: existing.length })) {
    return {
      error:
        "Ya has generado todos los NFC propios que te corresponden. Compra un álbum adicional para conseguir uno más, o pide un NFC físico en la tienda.",
    };
  }

  const admin = createAdminClient();

  for (let attempt = 0; attempt < 3; attempt++) {
    const token = generateNfcToken();
    const { error } = await admin.from("nfc_tags").insert({
      public_token: token,
      status: "sold",
      owner_id: userId,
      self_generated: true,
    });

    if (!error) {
      revalidatePath("/cuenta");
      return { token, url: buildNfcUrl(token) };
    }
  }

  return { error: "No hemos podido generar tu NFC. Inténtalo otra vez." };
}
