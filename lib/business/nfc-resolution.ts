export type NfcOutcome =
  | { type: "not_found" }
  | { type: "not_configured"; redirectToWizard: boolean }
  | { type: "preparing" }
  | { type: "password_required" }
  | { type: "viewer" };

/**
 * Decide qué debe ver quien acerca el móvil a un NFC (spec #4/#5/#6),
 * sin tocar la base de datos — toda la información ya viene resuelta
 * como parámetros, así se puede testear cada caso por separado.
 */
export function decideNfcOutcome(input: {
  tagExists: boolean;
  albumId: string | null;
  albumExists: boolean;
  albumStatus?: "draft" | "published";
  albumPrivacy?: "public" | "private";
  isLoggedIn: boolean;
  hasPrivateAccess: boolean;
}): NfcOutcome {
  if (!input.tagExists) return { type: "not_found" };

  if (!input.albumId) {
    // NFC en stock/reservado pero todavía no asociado a ningún álbum (spec #5).
    return { type: "not_configured", redirectToWizard: input.isLoggedIn };
  }

  if (!input.albumExists) return { type: "not_found" };

  if (input.albumStatus !== "published") return { type: "preparing" };

  if (input.albumPrivacy === "private" && !input.hasPrivateAccess) {
    return { type: "password_required" };
  }

  return { type: "viewer" };
}
