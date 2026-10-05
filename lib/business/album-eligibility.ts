export type AlbumCreditLimits = {
  photo_limit: number;
  video_limit: number;
  storage_limit_mb: number;
};

export type EligibilityResult =
  | { canCreate: true; usesCredit: true; limits: AlbumCreditLimits }
  | { canCreate: true; usesCredit: false; limits: null }
  | { canCreate: false; usesCredit: false; limits: null };

/**
 * Decide si un usuario puede crear un álbum nuevo, y con qué límites.
 * Regla: un crédito Premium sin consumir siempre gana; si no hay
 * crédito, solo se permite mientras no se haya agotado el cupo de
 * álbumes gratuitos del plan (normalmente 1).
 *
 * Función pura — sin acceso a base de datos — para poder testearla
 * sin mockear Supabase (spec #75).
 */
export function computeAlbumEligibility(input: {
  freeAlbumCount: number;
  credit: AlbumCreditLimits | null;
  freePlanMaxAlbums: number;
}): EligibilityResult {
  if (input.credit) {
    return { canCreate: true, usesCredit: true, limits: input.credit };
  }
  if (input.freeAlbumCount < input.freePlanMaxAlbums) {
    return { canCreate: true, usesCredit: false, limits: null };
  }
  return { canCreate: false, usesCredit: false, limits: null };
}

export type AlbumAvailabilityStatus = {
  freeRemaining: number;
  paidCreditsAvailable: number;
  totalAvailable: number;
};

/**
 * Resumen en una sola cifra de "cuántos álbumes puede crear este
 * usuario ahora mismo" (spec: un status claro, no solo créditos de
 * pago sueltos) — suma el hueco que le quede del álbum gratuito de
 * por vida con los créditos Premium que tenga sin usar.
 */
export function computeAlbumAvailability(input: {
  freeAlbumCount: number;
  freePlanMaxAlbums: number;
  paidCreditsAvailable: number;
}): AlbumAvailabilityStatus {
  const freeRemaining = Math.max(0, input.freePlanMaxAlbums - input.freeAlbumCount);
  return {
    freeRemaining,
    paidCreditsAvailable: input.paidCreditsAvailable,
    totalAvailable: freeRemaining + input.paidCreditsAvailable,
  };
}
