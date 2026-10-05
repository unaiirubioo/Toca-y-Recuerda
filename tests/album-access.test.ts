import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.ALBUM_ACCESS_SECRET = "clave-de-test-no-usar-en-produccion";
});

describe("signAlbumAccessToken / verifyAlbumAccessToken", () => {
  it("un token recién firmado es válido para su álbum", async () => {
    const { signAlbumAccessToken, verifyAlbumAccessToken } = await import("@/lib/security/album-access");
    const token = signAlbumAccessToken("album-123");
    expect(verifyAlbumAccessToken("album-123", token)).toBe(true);
  });

  it("un token firmado para OTRO álbum no sirve aquí", async () => {
    const { signAlbumAccessToken, verifyAlbumAccessToken } = await import("@/lib/security/album-access");
    const token = signAlbumAccessToken("album-A");
    expect(verifyAlbumAccessToken("album-B", token)).toBe(false);
  });

  it("un token manipulado (firma alterada) se rechaza", async () => {
    const { signAlbumAccessToken, verifyAlbumAccessToken } = await import("@/lib/security/album-access");
    const token = signAlbumAccessToken("album-123");
    const tampered = token.slice(0, -2) + "00";
    expect(verifyAlbumAccessToken("album-123", tampered)).toBe(false);
  });

  it("sin cookie (undefined) nunca da acceso", async () => {
    const { verifyAlbumAccessToken } = await import("@/lib/security/album-access");
    expect(verifyAlbumAccessToken("album-123", undefined)).toBe(false);
  });
});
