import { describe, it, expect } from "vitest";
import { decideNfcOutcome } from "@/lib/business/nfc-resolution";

describe("decideNfcOutcome", () => {
  it("token que no existe → not_found (nunca revela si existió)", () => {
    const outcome = decideNfcOutcome({
      tagExists: false,
      albumId: null,
      albumExists: false,
      isLoggedIn: false,
      hasPrivateAccess: false,
    });
    expect(outcome).toEqual({ type: "not_found" });
  });

  it("NFC sin álbum asociado y visitante anónimo → pantalla de 'no configurado', sin redirigir", () => {
    const outcome = decideNfcOutcome({
      tagExists: true,
      albumId: null,
      albumExists: false,
      isLoggedIn: false,
      hasPrivateAccess: false,
    });
    expect(outcome).toEqual({ type: "not_configured", redirectToWizard: false });
  });

  it("NFC sin álbum asociado pero el visitante ya tiene sesión → redirige directo al asistente", () => {
    const outcome = decideNfcOutcome({
      tagExists: true,
      albumId: null,
      albumExists: false,
      isLoggedIn: true,
      hasPrivateAccess: false,
    });
    expect(outcome).toEqual({ type: "not_configured", redirectToWizard: true });
  });

  it("álbum asociado pero todavía en borrador → 'preparing', nunca un 404", () => {
    const outcome = decideNfcOutcome({
      tagExists: true,
      albumId: "album-1",
      albumExists: true,
      albumStatus: "draft",
      albumPrivacy: "public",
      isLoggedIn: false,
      hasPrivateAccess: false,
    });
    expect(outcome).toEqual({ type: "preparing" });
  });

  it("álbum publicado y privado sin contraseña introducida → pide contraseña", () => {
    const outcome = decideNfcOutcome({
      tagExists: true,
      albumId: "album-1",
      albumExists: true,
      albumStatus: "published",
      albumPrivacy: "private",
      isLoggedIn: false,
      hasPrivateAccess: false,
    });
    expect(outcome).toEqual({ type: "password_required" });
  });

  it("álbum publicado y privado CON acceso ya concedido → visor directamente", () => {
    const outcome = decideNfcOutcome({
      tagExists: true,
      albumId: "album-1",
      albumExists: true,
      albumStatus: "published",
      albumPrivacy: "private",
      isLoggedIn: false,
      hasPrivateAccess: true,
    });
    expect(outcome).toEqual({ type: "viewer" });
  });

  it("álbum publicado y público → visor sin ninguna barrera", () => {
    const outcome = decideNfcOutcome({
      tagExists: true,
      albumId: "album-1",
      albumExists: true,
      albumStatus: "published",
      albumPrivacy: "public",
      isLoggedIn: false,
      hasPrivateAccess: false,
    });
    expect(outcome).toEqual({ type: "viewer" });
  });
});
