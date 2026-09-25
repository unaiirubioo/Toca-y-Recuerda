import { describe, it, expect } from "vitest";
import { categoryForProductType, computeUnitPriceCents, bestValueId } from "@/lib/business/store-products";

describe("categoryForProductType", () => {
  it("los packs de NFC van a la categoría 'nfc'", () => {
    expect(categoryForProductType("nfc_pack")).toBe("nfc");
  });

  it("los packs combinados van a 'packs'", () => {
    expect(categoryForProductType("combo_pack")).toBe("packs");
  });

  it("Premium y packs de álbum van a 'albumes'", () => {
    expect(categoryForProductType("premium_upgrade")).toBe("albumes");
    expect(categoryForProductType("album_pack")).toBe("albumes");
  });
});

describe("computeUnitPriceCents", () => {
  it("un producto de una sola unidad no tiene 'precio por unidad'", () => {
    expect(computeUnitPriceCents(499, 1, 0)).toBeNull();
  });

  it("Pack 5 álbumes (17,99€ / 5) calcula el precio por álbum", () => {
    expect(computeUnitPriceCents(1799, 5, 0)).toBe(360); // 3,60€ redondeado
  });

  it("Pack Viajes (3 NFC + 3 álbumes = 6 unidades) calcula el precio por unidad combinada", () => {
    expect(computeUnitPriceCents(3299, 3, 3)).toBe(550); // 32,99€ / 6 ≈ 5,50€
  });
});

describe("bestValueId (destacado honesto, spec #19)", () => {
  it("elige el producto con menor precio por unidad", () => {
    const products = [
      { id: "pack-5", unitPriceCents: 360 },
      { id: "pack-10", unitPriceCents: 300 },
      { id: "extra", unitPriceCents: null },
    ];
    expect(bestValueId(products)).toBe("pack-10");
  });

  it("no destaca nada si solo hay un producto con precio por unidad para comparar", () => {
    const products = [{ id: "unico", unitPriceCents: 360 }];
    expect(bestValueId(products)).toBeNull();
  });
});
