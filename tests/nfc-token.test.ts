import { describe, it, expect } from "vitest";
import { generateNfcToken, buildNfcUrl } from "@/lib/nfc";

describe("generateNfcToken", () => {
  it("genera tokens de 16 caracteres", () => {
    expect(generateNfcToken()).toHaveLength(16);
  });

  it("nunca genera tokens secuenciales o predecibles (spec #3)", () => {
    const tokens = Array.from({ length: 20 }, () => generateNfcToken());
    const unique = new Set(tokens);
    expect(unique.size).toBe(tokens.length);
    // Ninguno debe parecerse a /n/1, /n/2... (números puros)
    for (const token of tokens) {
      expect(/^\d+$/.test(token)).toBe(false);
    }
  });

  it("no usa caracteres ambiguos (0/O, 1/l/I)", () => {
    const token = generateNfcToken();
    expect(token).not.toMatch(/[0OIl1]/);
  });
});

describe("buildNfcUrl", () => {
  it("construye la URL completa con el token", () => {
    const url = buildNfcUrl("abc123");
    expect(url).toMatch(/\/n\/abc123$/);
    expect(url).toMatch(/^https?:\/\//);
  });
});
