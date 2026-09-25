import { describe, it, expect } from "vitest";
import { exceedsCountLimit, exceedsStorageLimit, type AlbumUsage } from "@/lib/business/media-limits";

const baseUsage: AlbumUsage = {
  photoCount: 29,
  videoCount: 4,
  photoLimit: 30,
  videoLimit: 5,
  storageUsedMb: 490,
  storageLimitMb: 500,
};

describe("exceedsCountLimit", () => {
  it("permite la última foto antes de llegar al límite", () => {
    expect(exceedsCountLimit("photo", baseUsage)).toBe(false);
  });

  it("bloquea una foto más cuando ya se alcanzó el límite exacto", () => {
    expect(exceedsCountLimit("photo", { ...baseUsage, photoCount: 30 })).toBe(true);
  });

  it("permite el último vídeo antes de llegar al límite", () => {
    expect(exceedsCountLimit("video", baseUsage)).toBe(false);
  });

  it("bloquea un vídeo más cuando ya se alcanzó el límite", () => {
    expect(exceedsCountLimit("video", { ...baseUsage, videoCount: 5 })).toBe(true);
  });
});

describe("exceedsStorageLimit", () => {
  it("permite una subida que cabe justo en el límite", () => {
    expect(exceedsStorageLimit(baseUsage, 10)).toBe(false);
  });

  it("bloquea una subida que se pasa del límite aunque sea por poco", () => {
    expect(exceedsStorageLimit(baseUsage, 10.5)).toBe(true);
  });

  it("bloquea archivos grandes que de un solo golpe superan el límite Premium", () => {
    const premium: AlbumUsage = { ...baseUsage, storageUsedMb: 5000, storageLimitMb: 5120 };
    expect(exceedsStorageLimit(premium, 300)).toBe(true); // spec: vídeo hasta 300MB, pero aquí ya no cabe
  });
});
