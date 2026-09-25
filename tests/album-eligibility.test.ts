import { describe, it, expect } from "vitest";
import { computeAlbumEligibility } from "@/lib/business/album-eligibility";

describe("computeAlbumEligibility (límites gratuitos y Premium)", () => {
  it("permite crear el primer álbum gratuito", () => {
    const result = computeAlbumEligibility({ freeAlbumCount: 0, credit: null, freePlanMaxAlbums: 1 });
    expect(result).toEqual({ canCreate: true, usesCredit: false, limits: null });
  });

  it("bloquea un segundo álbum gratuito cuando ya se agotó el cupo", () => {
    const result = computeAlbumEligibility({ freeAlbumCount: 1, credit: null, freePlanMaxAlbums: 1 });
    expect(result.canCreate).toBe(false);
  });

  it("un crédito Premium disponible siempre permite crear, aunque el cupo gratis esté agotado", () => {
    const limits = { photo_limit: 500, video_limit: 20, storage_limit_mb: 5120 };
    const result = computeAlbumEligibility({ freeAlbumCount: 1, credit: limits, freePlanMaxAlbums: 1 });
    expect(result).toEqual({ canCreate: true, usesCredit: true, limits });
  });

  it("el crédito Premium gana incluso si todavía queda cupo gratis (se prioriza consumir el crédito)", () => {
    const limits = { photo_limit: 500, video_limit: 20, storage_limit_mb: 5120 };
    const result = computeAlbumEligibility({ freeAlbumCount: 0, credit: limits, freePlanMaxAlbums: 1 });
    expect(result.usesCredit).toBe(true);
  });

  it("respeta un cupo gratuito distinto de 1 si el plan cambiara", () => {
    const result = computeAlbumEligibility({ freeAlbumCount: 2, credit: null, freePlanMaxAlbums: 3 });
    expect(result.canCreate).toBe(true);
  });
});
