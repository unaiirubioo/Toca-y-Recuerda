/**
 * Portada del álbum generada con IA de verdad (spec #11), gratis y sin
 * clave: pollinations.ai genera la imagen al vuelo a partir de un
 * `<img src=...>` — no hace ninguna llamada desde nuestro servidor, así
 * que no añade nada al tiempo de publicar el álbum. Se usa solo cuando
 * el usuario no tiene una foto de portada propia resuelta — nunca
 * sustituye a un recuerdo real, solo evita el degradado gris genérico
 * cuando no hay nada mejor que mostrar.
 *
 * `seed` se deriva del id del álbum: la misma imagen se genera siempre
 * para el mismo álbum, en vez de cambiar en cada visita.
 */
const THEME_STYLE: Record<string, string> = {
  classic: "elegant vintage scrapbook texture, warm sepia and gold tones, soft film grain, timeless nostalgic atmosphere",
  moderno: "vibrant modern flat illustration, bold warm gradient colors, dynamic joyful composition, contemporary editorial design",
  minimal: "minimalist serene aesthetic, soft pastel cream and terracotta palette, plenty of negative space, calm elegant",
};

function hashToSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(h, 31) + id.charCodeAt(i)) >>> 0;
  }
  return h % 1_000_000;
}

export function buildAiCoverImageUrl(input: {
  albumId: string;
  title: string;
  theme: string;
  locationName: string | null;
}): string {
  const style = THEME_STYLE[input.theme] ?? THEME_STYLE.classic;
  const where = input.locationName ? `, inspired by ${input.locationName}` : "";
  const prompt =
    `beautiful abstract memory keepsake album cover art for "${input.title}"${where}, ${style}, ` +
    `no text, no readable words, no people faces, no watermark, high quality digital art`;

  const params = new URLSearchParams({
    width: "1600",
    height: "900",
    seed: String(hashToSeed(input.albumId)),
    nologo: "true",
  });

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}
