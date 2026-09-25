import { describe, it, expect } from "vitest";
import { signUpSchema, signInSchema, requestPasswordResetSchema } from "@/lib/validations/auth";

describe("signUpSchema (registro)", () => {
  it("acepta un registro válido", () => {
    const result = signUpSchema.safeParse({ fullName: "Ana", email: "ana@ejemplo.com", password: "contraseña123" });
    expect(result.success).toBe(true);
  });

  it("rechaza un email mal formado", () => {
    const result = signUpSchema.safeParse({ fullName: "Ana", email: "no-es-un-email", password: "contraseña123" });
    expect(result.success).toBe(false);
  });

  it("rechaza una contraseña demasiado corta", () => {
    const result = signUpSchema.safeParse({ fullName: "Ana", email: "ana@ejemplo.com", password: "1234" });
    expect(result.success).toBe(false);
  });

  it("rechaza un nombre vacío", () => {
    const result = signUpSchema.safeParse({ fullName: "", email: "ana@ejemplo.com", password: "contraseña123" });
    expect(result.success).toBe(false);
  });
});

describe("signInSchema (login)", () => {
  it("acepta credenciales con formato válido", () => {
    const result = signInSchema.safeParse({ email: "ana@ejemplo.com", password: "cualquier-cosa" });
    expect(result.success).toBe(true);
  });

  it("rechaza una contraseña vacía", () => {
    const result = signInSchema.safeParse({ email: "ana@ejemplo.com", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("requestPasswordResetSchema", () => {
  it("exige un email válido para poder enviar el enlace", () => {
    expect(requestPasswordResetSchema.safeParse({ email: "ana@ejemplo.com" }).success).toBe(true);
    expect(requestPasswordResetSchema.safeParse({ email: "" }).success).toBe(false);
  });
});
