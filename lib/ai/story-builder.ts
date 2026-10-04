/**
 * Agrupa los archivos de un álbum en "momentos" a partir de los datos
 * que ya calculó el navegador de quien los subió (fecha EXIF, hash
 * perceptual, nitidez, etiquetas — ver lib/ai/client-vision.ts).
 *
 * Es una función pura, sin acceso a red ni a base de datos: se puede
 * testear sola y se puede ejecutar tanto en el servidor (al publicar)
 * como, si hiciera falta, en el navegador.
 */

export type MediaForStory = {
  id: string;
  type: "photo" | "video";
  takenAt: string | null; // ISO
  phash: string | null;
  blurScore: number | null;
  tags: string[];
  caption: string | null;
  sortOrder: number;
};

export type Moment = {
  mediaIds: string[];
  highlightMediaIds: string[];
  tags: string[];
  startsAt: string | null;
  endsAt: string | null;
};

// Más de esto entre dos fotos y consideramos que empieza un momento nuevo.
const GAP_HOURS = 5;

/** Distancia de Hamming entre dos hashes hex (duplicado si es muy baja). */
function hamming(a: string, b: string): number {
  if (a.length !== b.length) return Number.MAX_SAFE_INTEGER;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i]!, 16) ^ parseInt(b[i]!, 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

export function buildMoments(media: MediaForStory[]): Moment[] {
  if (media.length === 0) return [];

  // Orden cronológico cuando hay fecha; si no, se respeta el orden de subida.
  const sorted = [...media].sort((a, b) => {
    if (a.takenAt && b.takenAt) return a.takenAt.localeCompare(b.takenAt);
    if (a.takenAt) return -1;
    if (b.takenAt) return 1;
    return a.sortOrder - b.sortOrder;
  });

  const groups: MediaForStory[][] = [];
  for (const item of sorted) {
    const last = groups[groups.length - 1];
    if (!last) {
      groups.push([item]);
      continue;
    }
    const lastItem = last[last.length - 1]!;
    const gapOk = !item.takenAt || !lastItem.takenAt ? true : hoursBetween(lastItem.takenAt, item.takenAt) < GAP_HOURS;
    if (gapOk) {
      last.push(item);
    } else {
      groups.push([item]);
    }
  }

  // Ningún momento se queda demasiado pequeño en solitario cuando hay
  // pocas fotos en total: si solo hay 1-3 archivos, mejor un único
  // momento que obligarnos a inventar varias secciones vacías de contenido.
  const merged = media.length <= 3 ? [sorted] : groups;

  return merged.map((group) => buildMomentFromGroup(group));
}

function hoursBetween(aIso: string, bIso: string): number {
  return Math.abs(new Date(bIso).getTime() - new Date(aIso).getTime()) / (1000 * 60 * 60);
}

function buildMomentFromGroup(group: MediaForStory[]): Moment {
  // Duplicados/casi-duplicados: nos quedamos solo con la más nítida de
  // cada grupo de parecidas como candidata a destacado — el resto
  // sigue estando en "Todos los recuerdos", solo no se repite como highlight.
  const photos = group.filter((m) => m.type === "photo" && m.phash);
  const usedAsDuplicate = new Set<string>();
  const representative: MediaForStory[] = [];

  for (const item of photos) {
    if (usedAsDuplicate.has(item.id)) continue;
    let best = item;
    for (const other of photos) {
      if (other.id === item.id || usedAsDuplicate.has(other.id)) continue;
      if (hamming(item.phash!, other.phash!) <= 6) {
        usedAsDuplicate.add(other.id);
        if ((other.blurScore ?? 0) > (best.blurScore ?? 0)) best = other;
      }
    }
    representative.push(best);
  }

  // De las representativas (no borrosas, no duplicadas), las más
  // nítidas son las "destacadas" — como mucho un tercio del momento,
  // mínimo 1, máximo 6, para que la sección no sea un muro de fotos.
  const sharpEnough = representative
    .filter((m) => (m.blurScore ?? 0) > 2) // umbral bajo: solo descarta borrones evidentes
    .sort((a, b) => (b.blurScore ?? 0) - (a.blurScore ?? 0));
  const highlightCount = Math.min(6, Math.max(1, Math.round((sharpEnough.length || representative.length) / 3)));
  const highlights = (sharpEnough.length > 0 ? sharpEnough : representative).slice(0, highlightCount);

  const tagCounts = new Map<string, number>();
  for (const item of group) {
    for (const tag of item.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  const dated = group.filter((m) => m.takenAt);
  return {
    mediaIds: group.map((m) => m.id),
    highlightMediaIds: highlights.map((m) => m.id),
    tags: topTags,
    startsAt: dated[0]?.takenAt ?? null,
    endsAt: dated[dated.length - 1]?.takenAt ?? null,
  };
}
