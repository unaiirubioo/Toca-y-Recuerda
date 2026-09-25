export type DesignChoice = {
  theme: "classic" | "moderno" | "minimal";
  layout: "grid" | "revista" | "linea-tiempo";
};

const MODERN_KEYWORDS = [
  "fiesta", "cumple", "festival", "boda", "graduacion", "graduación",
  "aventura", "viaje", "verano", "concierto", "amigos",
];
const MINIMAL_KEYWORDS = ["minimalista", "simple", "tranquilo", "paz", "relax", "boho"];

/**
 * Elige un tema y una distribución "inteligentes" a partir del título,
 * la música y el número de fotos — sin llamar a ningún modelo
 * generativo. Es determinista a propósito: nunca falla, no depende de
 * un servicio externo, y es gratis para siempre porque es solo código
 * nuestro. Se combina con generateAiBlurb() (sí, esa parte llama a una
 * IA real) para dar el efecto completo de "diseñado con IA".
 */
export function chooseAiDesign(input: {
  title: string;
  hasMusic: boolean;
  photoCount: number;
}): DesignChoice {
  const t = input.title.toLowerCase();

  if (MINIMAL_KEYWORDS.some((k) => t.includes(k))) {
    return { theme: "minimal", layout: "grid" };
  }
  if (MODERN_KEYWORDS.some((k) => t.includes(k)) || input.hasMusic) {
    return { theme: "moderno", layout: input.photoCount > 15 ? "revista" : "grid" };
  }
  if (input.photoCount > 20) {
    return { theme: "classic", layout: "linea-tiempo" };
  }
  return { theme: "classic", layout: "grid" };
}
