import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

// scrypt del propio Node: sin dependencias externas, suficientemente
// robusto para una contraseña de acceso a un álbum (no es una cuenta de
// usuario). Formato almacenado: "salt:hash", ambos en hex.
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const candidate = scryptSync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;

  return timingSafeEqual(candidate, expected);
}
