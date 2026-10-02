/**
 * Organiza el collage de fotos/vídeos usando datos REALES de cada
 * imagen (su forma: panorámica, vertical o cuadrada) — no hace falta
 * "ver" el contenido para colocar mejor las piezas, igual que haría
 * alguien maquetando un álbum de papel a mano: a una foto panorámica
 * le da más ancho, a una vertical más alto, y destaca la más
 * espectacular de todas. Función pura, fácil de testear.
 */
export type CollageSpan = { colSpan: 1 | 2; rowSpan: 1 | 2 };

const WIDE_RATIO = 1.35; // más ancha que alta por un buen margen
const TALL_RATIO = 0.7; // más alta que ancha por un buen margen

export function assignCollageSpans(ratios: (number | null)[]): CollageSpan[] {
  // La proporción más extrema (la foto "más panorámica de todas") se
  // destaca como pieza protagonista del collage — un detalle que un
  // maquetador humano haría, hecho aquí con un dato objetivo (la
  // forma real del archivo), no al azar.
  let heroIndex = -1;
  let heroScore = 0;
  ratios.forEach((r, i) => {
    if (r == null) return;
    const score = Math.abs(Math.log(r));
    if (score > heroScore) {
      heroScore = score;
      heroIndex = i;
    }
  });

  return ratios.map((ratio, i) => {
    if (i === heroIndex && ratio != null) {
      return ratio >= 1 ? { colSpan: 2, rowSpan: 1 } : { colSpan: 1, rowSpan: 2 };
    }
    if (ratio == null) return { colSpan: 1, rowSpan: 1 };
    if (ratio >= WIDE_RATIO) return { colSpan: 2, rowSpan: 1 };
    if (ratio <= TALL_RATIO) return { colSpan: 1, rowSpan: 2 };
    return { colSpan: 1, rowSpan: 1 };
  });
}
