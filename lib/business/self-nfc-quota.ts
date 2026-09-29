/**
 * Cuota de NFC "autogenerados" por el propio usuario desde Ajustes de
 * su cuenta (spec: sin chip físico, para quien solo compra el álbum y
 * configura él mismo su NFC). Regla:
 *  - Todo el mundo tiene 1 gratis, siempre.
 *  - Cada crédito de álbum comprado SOLO como álbum (premium_upgrade o
 *    album_pack, sin NFC físico incluido) añade 1 más al cupo.
 *  - Los créditos que vienen de un pack con NFC físico (nfc_pack o
 *    combo_pack) NO añaden cupo extra — ya tienen su propio NFC físico.
 *
 * Función pura, testeable sin base de datos.
 */
export function computeSelfNfcQuota(input: { albumOnlyCreditsPurchased: number }): number {
  return 1 + Math.max(0, input.albumOnlyCreditsPurchased);
}

export function canGenerateSelfNfc(input: {
  albumOnlyCreditsPurchased: number;
  alreadyGenerated: number;
}): boolean {
  return input.alreadyGenerated < computeSelfNfcQuota(input);
}
