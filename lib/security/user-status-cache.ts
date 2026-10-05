/**
 * Cachea brevemente (60s) el resultado de "¿está bloqueado? ¿es admin?"
 * por usuario, para no pagar una consulta a Postgres en cada navegación
 * protegida del middleware. Mismo patrón y misma limitación que
 * `rate-limit.ts`: en memoria, por instancia — en el peor caso (varias
 * instancias), el dato puede tardar hasta 60s en refrescarse tras un
 * bloqueo/desbloqueo. Para esta plataforma es un compromiso razonable:
 * un bloqueo no es una alarma de incendios, un minuto de margen está bien.
 *
 * ⚠️ Aviso honesto adicional: el middleware corre en el Edge Runtime de
 * Vercel, mientras que los Server Actions (donde se llama a
 * invalidateCachedUserStatus al bloquear a alguien) corren en el
 * runtime de Node — son procesos distintos, con memoria distinta. En
 * la práctica, esa invalidación puede no llegar a la caché que lee el
 * middleware, y el bloqueo tarda el TTL completo (hasta 60s) en
 * notarse. Se deja la llamada porque es inofensiva y queda lista por
 * si en el futuro el middleware se ejecuta en el runtime de Node.
 */

type CachedStatus = { role: string; isBlocked: boolean; expiresAt: number };

const cache = new Map<string, CachedStatus>();
const TTL_MS = 60 * 1000;

export function getCachedUserStatus(userId: string): { role: string; isBlocked: boolean } | null {
  const entry = cache.get(userId);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return { role: entry.role, isBlocked: entry.isBlocked };
}

export function setCachedUserStatus(userId: string, role: string, isBlocked: boolean): void {
  cache.set(userId, { role, isBlocked, expiresAt: Date.now() + TTL_MS });
}

/** Se llama al bloquear/desbloquear o cambiar el rol desde /admin, para no esperar el TTL. */
export function invalidateCachedUserStatus(userId: string): void {
  cache.delete(userId);
}
