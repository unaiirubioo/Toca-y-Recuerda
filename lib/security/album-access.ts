import { createHmac, timingSafeEqual } from "crypto";

const TTL_SECONDS = 60 * 60 * 24; // 24 horas: razonable para quien recibe el enlace/NFC

function secret(): string {
  const s = process.env.ALBUM_ACCESS_SECRET;
  if (!s) throw new Error("Falta ALBUM_ACCESS_SECRET en las variables de entorno.");
  return s;
}

export function cookieNameForAlbum(albumId: string): string {
  return `album_access_${albumId}`;
}

/** Genera el valor de la cookie que demuestra que se ha introducido la contraseña correcta. */
export function signAlbumAccessToken(albumId: string): string {
  const expires = Date.now() + TTL_SECONDS * 1000;
  const payload = `${albumId}.${expires}`;
  const signature = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${expires}.${signature}`;
}

export function verifyAlbumAccessToken(albumId: string, token: string | undefined): boolean {
  if (!token) return false;
  const [expiresStr, signature] = token.split(".");
  const expires = Number(expiresStr);
  if (!expires || !signature || Date.now() > expires) return false;

  const payload = `${albumId}.${expires}`;
  const expected = createHmac("sha256", secret()).update(payload).digest("hex");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
