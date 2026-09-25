export type StoreCategory = "albumes" | "nfc" | "packs";

export function categoryForProductType(type: string): StoreCategory {
  if (type === "nfc_pack") return "nfc";
  if (type === "combo_pack") return "packs";
  return "albumes";
}

/** € por unidad (álbum o NFC), o null si el producto es de una sola unidad (no hay "por unidad" que mostrar). */
export function computeUnitPriceCents(
  priceCents: number,
  albumCredits: number,
  nfcCredits: number
): number | null {
  const units = albumCredits + nfcCredits;
  if (units <= 1) return null;
  return Math.round(priceCents / units);
}

/** El id del producto con mejor precio por unidad dentro de un grupo, o null si no hay al menos 2 con precio por unidad que comparar. */
export function bestValueId(products: { id: string; unitPriceCents: number | null }[]): string | null {
  const withUnitPrice = products.filter((p): p is { id: string; unitPriceCents: number } => p.unitPriceCents != null);
  if (withUnitPrice.length < 2) return null;
  return withUnitPrice.reduce((best, p) => (p.unitPriceCents < best.unitPriceCents ? p : best)).id;
}
