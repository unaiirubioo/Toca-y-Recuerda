import { customAlphabet } from "nanoid";
import { getSiteUrl } from "@/lib/site-url";

// Alfabeto sin caracteres ambiguos (0/O, 1/l/I) para que, si alguien
// tuviera que leerlo o transcribirlo a mano, no haya confusiones.
const alphabet = "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

// 16 caracteres de ese alfabeto: suficiente entropía para que no sea
// adivinable ni enumerable (nunca /n/1, /n/2, ... — spec #3).
const generate = customAlphabet(alphabet, 16);

/** Genera un public_token único para un nuevo NFC. */
export function generateNfcToken(): string {
  return generate();
}

/** Construye la URL pública completa que se grabará físicamente en el NFC. */
export function buildNfcUrl(publicToken: string): string {
  return `${getSiteUrl()}/n/${publicToken}`;
}
