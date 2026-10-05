import { describe, it, expect } from "vitest";
import { albumFormSchema } from "@/lib/validations/albums";

describe("albumFormSchema (creación de álbum)", () => {
  const base = {
    title: "Mi viaje a Bilbao",
    designTheme: "classic" as const,
    designFont: "default" as const,
    designLayout: "grid" as const,
    privacy: "private" as const,
  };

  it("acepta un álbum válido con solo el nombre obligatorio", () => {
    expect(albumFormSchema.safeParse(base).success).toBe(true);
  });

  it("rechaza un nombre de un solo carácter", () => {
    expect(albumFormSchema.safeParse({ ...base, title: "a" }).success).toBe(false);
  });

  it("rechaza un tema de diseño que no existe", () => {
    expect(albumFormSchema.safeParse({ ...base, designTheme: "futurista" }).success).toBe(false);
  });

  it("rechaza una URL de música mal formada, pero acepta vacío", () => {
    expect(albumFormSchema.safeParse({ ...base, musicUrl: "no-es-una-url" }).success).toBe(false);
    expect(albumFormSchema.safeParse({ ...base, musicUrl: "" }).success).toBe(true);
  });

  it("acepta público y privado como únicos valores de privacidad", () => {
    expect(albumFormSchema.safeParse({ ...base, privacy: "public" }).success).toBe(true);
    expect(albumFormSchema.safeParse({ ...base, privacy: "secreto" }).success).toBe(false);
  });
});
