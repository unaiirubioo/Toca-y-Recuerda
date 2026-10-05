import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/security/password";

describe("hashPassword / verifyPassword", () => {
  it("verifica correctamente la contraseña correcta", () => {
    const hash = hashPassword("mi-recuerdo-2024");
    expect(verifyPassword("mi-recuerdo-2024", hash)).toBe(true);
  });

  it("rechaza una contraseña incorrecta", () => {
    const hash = hashPassword("mi-recuerdo-2024");
    expect(verifyPassword("otra-cosa", hash)).toBe(false);
  });

  it("nunca guarda la contraseña en texto plano dentro del hash", () => {
    const hash = hashPassword("secreto-familiar");
    expect(hash).not.toContain("secreto-familiar");
  });

  it("dos hashes de la misma contraseña son distintos (sal aleatoria)", () => {
    const a = hashPassword("misma-contraseña");
    const b = hashPassword("misma-contraseña");
    expect(a).not.toBe(b);
    expect(verifyPassword("misma-contraseña", a)).toBe(true);
    expect(verifyPassword("misma-contraseña", b)).toBe(true);
  });

  it("un álbum sin contraseña guardada (null) nunca se puede desbloquear", () => {
    expect(verifyPassword("cualquier-cosa", null)).toBe(false);
  });
});
