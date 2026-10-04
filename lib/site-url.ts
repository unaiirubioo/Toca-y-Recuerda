/**
 * URL base pública del sitio, siempre sin barra final.
 *
 * OJO: usamos `||` y no `??`. Si en Vercel la variable de entorno
 * NEXT_PUBLIC_SITE_URL existe pero está vacía (algo muy fácil de hacer
 * sin querer al configurarla), `??` NO la sustituye — una cadena vacía
 * no es "nullish" — y cualquier `${process.env.NEXT_PUBLIC_SITE_URL}/...`
 * se queda como una URL relativa rota ("/auth/callback" en vez de
 * "https://tudominio.com/auth/callback"). Eso rompía, entre otras
 * cosas, el registro de nuevas cuentas (Supabase rechaza un
 * emailRedirectTo que no sea una URL absoluta) y los enlaces de los
 * NFC generados por el propio usuario.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://tocayrecuerda.com";
  return raw.replace(/\/+$/, "");
}
