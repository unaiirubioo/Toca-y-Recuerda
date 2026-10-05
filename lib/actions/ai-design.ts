"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chooseAiDesign } from "@/lib/ai/design-heuristic";
import { computeRenewalDueDate } from "@/lib/business/renewal";
import { buildMoments, type MediaForStory } from "@/lib/ai/story-builder";

export type AiStorySection = { title: string; description: string; mediaIds: string[]; highlightMediaIds: string[] };
export type AiStory = { intro: string; sections: AiStorySection[]; closing: string };

/**
 * Genera una frase breve para el álbum con un modelo de IA real,
 * gratuito y sin necesidad de clave (text.pollinations.ai). Si el
 * servicio no responde a tiempo o falla, se ignora sin más — nunca
 * debe bloquear la creación del álbum por depender de un tercero.
 */
async function generateAiBlurb(title: string, locationName: string | null, memoryHint: string | null): Promise<string | null> {
  const where = locationName ? ` en ${locationName}` : "";
  const context = memoryHint ? ` El momento que cuenta: "${memoryHint.slice(0, 300)}".` : "";
  const prompt =
    `Escribe una única frase breve, cálida y emotiva (máximo 22 palabras, en español de España) ` +
    `que resuma con cariño un álbum de recuerdos titulado "${title}"${where}.${context} ` +
    `Que suene como algo escrito a mano por alguien que quiere a quien lo lea, no como una descripción. ` +
    `Responde solo con la frase, sin comillas ni explicaciones.`;

  try {
    const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, {
      signal: AbortSignal.timeout(4500),
    });
    if (!res.ok) return null;

    const text = (await res.text()).trim().replace(/^"|"$/g, "");
    if (!text || text.length > 300) return null;
    return text;
  } catch {
    return null;
  }
}

function formatMomentForPrompt(moment: ReturnType<typeof buildMoments>[number], index: number): string {
  const when = moment.startsAt
    ? new Date(moment.startsAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
    : "sin fecha";
  const what = moment.tags.length > 0 ? moment.tags.join(", ") : "sin detalles concretos";
  return `Momento ${index + 1}: ${moment.mediaIds.length} archivo(s), del ${when}. Contenido detectado: ${what}.`;
}

/**
 * Construye una respuesta de reserva sin IA (siempre funciona, nunca
 * depende de un tercero) para cuando pollinations no responda a
 * tiempo o devuelva algo que no se pueda interpretar — el álbum nunca
 * se queda sin historia por culpa de un servicio externo.
 */
function fallbackStory(moments: ReturnType<typeof buildMoments>, title: string): AiStory {
  return {
    intro: `Estos son los recuerdos de "${title}".`,
    sections: moments.map((m, i) => ({
      title: m.tags.length > 0 ? `Momento ${i + 1}: ${m.tags[0]}` : `Momento ${i + 1}`,
      description: "",
      mediaIds: m.mediaIds,
      highlightMediaIds: m.highlightMediaIds,
    })),
    closing: "Gracias por revivir este recuerdo.",
  };
}

/**
 * Convierte las fotos/vídeos ya analizados en el navegador (fechas,
 * etiquetas, nitidez — ver lib/ai/client-vision.ts) en una historia con
 * introducción, secciones con título y descripción, y cierre. Solo se
 * envían al modelo de texto ETIQUETAS Y FECHAS, nunca las fotos en sí
 * (spec de privacidad) — y es el mismo servicio gratuito y sin clave
 * que ya usa generateAiBlurb.
 */
async function generateStoryText(title: string, locationName: string | null, moments: ReturnType<typeof buildMoments>): Promise<AiStory> {
  const fallback = fallbackStory(moments, title);
  if (moments.length === 0) return fallback;

  const where = locationName ? ` en ${locationName}` : "";
  const momentsText = moments.map(formatMomentForPrompt).join("\n");
  const prompt =
    `Eres quien escribe el álbum de recuerdos "${title}"${where}. Te doy una lista de momentos detectados ` +
    `automáticamente a partir de las fotos (fecha y qué aparece en ellas), en orden cronológico:\n${momentsText}\n\n` +
    `Devuelve SOLO un JSON válido (sin markdown, sin explicaciones) con esta forma exacta:\n` +
    `{"intro": "frase breve y cálida de apertura", "sections": [{"title": "título corto y natural para el momento 1", "description": "una frase breve sobre ese momento"}, ...], "closing": "frase breve de cierre"}\n` +
    `Debe haber exactamente ${moments.length} elementos en "sections", en el mismo orden. Escribe en español de ` +
    `España, con cariño, variando los títulos según el contenido real de cada momento — nunca repitas siempre ` +
    `las mismas palabras ("Introducción", "Momento X") a menos que no haya más remedio.`;

  try {
    const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, {
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return fallback;

    const raw = (await res.text()).trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed || !Array.isArray(parsed.sections) || parsed.sections.length !== moments.length) return fallback;

    return {
      intro: typeof parsed.intro === "string" && parsed.intro.trim() ? parsed.intro.trim() : fallback.intro,
      closing: typeof parsed.closing === "string" && parsed.closing.trim() ? parsed.closing.trim() : fallback.closing,
      sections: moments.map((m, i) => ({
        title:
          typeof parsed.sections[i]?.title === "string" && parsed.sections[i].title.trim()
            ? parsed.sections[i].title.trim()
            : fallback.sections[i]!.title,
        description: typeof parsed.sections[i]?.description === "string" ? parsed.sections[i].description.trim() : "",
        mediaIds: m.mediaIds,
        highlightMediaIds: m.highlightMediaIds,
      })),
    };
  } catch {
    return fallback;
  }
}

/**
 * Agrupa las fotos/vídeos del álbum en momentos y genera su historia
 * (spec: "que la IA convierta las fotos y vídeos en una historia de
 * recuerdos, no una simple galería"). Se guarda en albums.ai_story y
 * se marca qué archivos son "destacados" de cada momento — el resto
 * sigue intacto en "Todos los recuerdos", nunca se borra ni se oculta.
 * Si algo falla a medio camino, el álbum sigue publicándose igual, solo
 * que sin historia (se puede volver a intentar luego).
 */
async function buildAndSaveStory(albumId: string, title: string, locationName: string | null): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: mediaRows } = await admin
      .from("album_media")
      .select("id, type, taken_at, phash, blur_score, tags, caption, sort_order")
      .eq("album_id", albumId)
      .order("sort_order", { ascending: true });

    const media: MediaForStory[] = ((mediaRows as any[]) ?? []).map((m) => ({
      id: m.id,
      type: m.type,
      takenAt: m.taken_at,
      phash: m.phash,
      blurScore: m.blur_score,
      tags: m.tags ?? [],
      caption: m.caption,
      sortOrder: m.sort_order,
    }));
    if (media.length === 0) return;

    const moments = buildMoments(media);
    const story = await generateStoryText(title, locationName, moments);

    await admin.from("albums").update({ ai_story: story }).eq("id", albumId);

    await Promise.all(
      moments.flatMap((moment, index) =>
        moment.mediaIds.map((mediaId) =>
          admin
            .from("album_media")
            .update({ moment_index: index, is_highlight: moment.highlightMediaIds.includes(mediaId) })
            .eq("id", mediaId)
        )
      )
    );
  } catch (err) {
    console.error("buildAndSaveStory:", err);
    // Nunca propagamos el error: el álbum se queda publicado sin
    // historia generada en vez de fallar la publicación entera.
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

  const [{ data: album }, { data: memoryRows }] = await Promise.all([
    supabase
      .from("albums")
      .select("title, location_name, photo_count, video_count, music_url, renewal_due_at")
      .eq("id", albumId)
      .single(),
    supabase.from("album_memories").select("content").eq("album_id", albumId).limit(1),
  ]);

  if (!album) return { error: "No hemos encontrado el álbum." };
  const a = album as any;

  // Nunca se publica un álbum vacío (spec: antes se dejaba publicar sin
  // título ni contenido). Exigimos un título real y al menos una foto
  // o un vídeo — el resto de campos siguen siendo opcionales.
  if (!a.title || String(a.title).trim().length < 2) {
    return { error: "Ponle un nombre a tu recuerdo antes de publicarlo." };
  }
  if ((a.photo_count ?? 0) === 0 && (a.video_count ?? 0) === 0) {
    return { error: "Añade al menos una foto o un vídeo antes de publicarlo." };
  }

  const design = chooseAiDesign({
    title: a.title,
    hasMusic: !!a.music_url,
    photoCount: a.photo_count,
  });

  const memoryHint = (memoryRows as any[])?.[0]?.content ?? null;
  const blurb = await generateAiBlurb(a.title, a.location_name, memoryHint);

  // Conservación de archivos cada 5 años (spec #10): se fija la
  // primera vez que se publica, nunca se pisa si ya existe (por
  // ejemplo, al volver a guardar cambios en un álbum ya publicado).
  const renewalDueAt = a.renewal_due_at ?? computeRenewalDueDate(new Date()).toISOString();

  const { error } = await supabase
    .from("albums")
    .update({
      design_theme: design.theme,
      design_layout: design.layout,
      ...(blurb ? { description: blurb } : {}),
      status: "published",
      renewal_due_at: renewalDueAt,
    })
    .eq("id", albumId);

  if (error) return { error: "No hemos podido publicar el álbum. Inténtalo otra vez." };

  // Se hace DESPUÉS de confirmar que el álbum se publicó correctamente,
  // y nunca puede hacer fallar la publicación (ver el try/catch interno
  // de buildAndSaveStory) — así, aunque la generación de la historia
  // tarde o falle, el usuario ya tiene su álbum publicado.
  await buildAndSaveStory(albumId, a.title, a.location_name);

  return { ok: true };
}

/**
 * Guarda la historia de IA después de que el usuario la edite a mano
 * (spec #4 y #9): títulos de cada momento, descripciones, orden de los
 * momentos y qué foto va en cada uno — todo editable e intuitivo desde
 * la edición del álbum. Se comprueba la propiedad con el cliente
 * normal (RLS) y se escribe con el cliente admin, igual que el resto
 * de acciones de edición de álbum.
 */
export async function updateAiStory(albumId: string, story: AiStory): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Tu sesión ha caducado. Inicia sesión otra vez." };

  const { data: album } = await supabase.from("albums").select("id").eq("id", albumId).maybeSingle();
  if (!album) return { error: "No hemos encontrado ese álbum." };

  const admin = createAdminClient();
  const { error } = await admin.from("albums").update({ ai_story: story }).eq("id", albumId);
  if (error) {
    console.error("updateAiStory:", error.message);
    return { error: "No hemos podido guardar los cambios. Inténtalo otra vez." };
  }

  // Mantiene moment_index / is_highlight de cada archivo en sintonía
  // con la historia editada, por si algo más de la app (como el panel
  // de admin) llega a fijarse en esas columnas en vez de en ai_story.
  await Promise.all(
    story.sections.flatMap((section, index) =>
      section.mediaIds.map((mediaId) =>
        admin
          .from("album_media")
          .update({ moment_index: index, is_highlight: section.highlightMediaIds.includes(mediaId) })
          .eq("id", mediaId)
      )
    )
  );

  revalidatePath(`/albumes/${albumId}/editar`);
  return {};
}
