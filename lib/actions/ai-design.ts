"use server";

import { createClient } from "@/lib/supabase/server";
import { chooseAiDesign } from "@/lib/ai/design-heuristic";

/**
 * Genera una frase breve para el álbum con un modelo de IA real,
 * gratuito y sin necesidad de clave (text.pollinations.ai). Si el
 * servicio no responde a tiempo o falla, se ignora sin más — nunca
 * debe bloquear la creación del álbum por depender de un tercero.
 */
async function generateAiBlurb(title: string, locationName: string | null): Promise<string | null> {
  const where = locationName ? ` en ${locationName}` : "";
  const prompt =
    `Escribe una única frase breve, cálida y poética (máximo 22 palabras, en español) ` +
    `para presentar un álbum de recuerdos titulado "${title}"${where}. ` +
    `Responde solo con la frase, sin comillas ni explicaciones.`;

  try {
    const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const text = (await res.text()).trim().replace(/^"|"$/g, "");
    if (!text || text.length > 300) return null;
    return text;
  } catch {
    return null;
  }
}

/**
 * Se llama al terminar el asistente de creación: elige tema/distribución
 * y (si el servicio de IA responde) una frase de presentación, y
 * publica el álbum. Todo en una sola llamada para no hacer esperar de
 * más al usuario en la pantalla de "diseñando con IA".
 */
export async function finalizeAlbumWithAi(albumId: string): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient();

  const { data: album } = await supabase
    .from("albums")
    .select("title, location_name, photo_count, music_url")
    .eq("id", albumId)
    .single();

  if (!album) return { error: "No hemos encontrado el álbum." };
  const a = album as any;

  const design = chooseAiDesign({
    title: a.title,
    hasMusic: !!a.music_url,
    photoCount: a.photo_count,
  });

  const blurb = await generateAiBlurb(a.title, a.location_name);

  const { error } = await supabase
    .from("albums")
    .update({
      design_theme: design.theme,
      design_layout: design.layout,
      ...(blurb ? { description: blurb } : {}),
      status: "published",
    })
    .eq("id", albumId);

  if (error) return { error: "No hemos podido publicar el álbum. Inténtalo otra vez." };

  return { ok: true };
}
