/**
 * Rate limiter en memoria — deliberadamente simple, sin dependencias
 * externas. Funciona perfectamente en un solo proceso (por ejemplo,
 * Vercel con una única región/instancia caliente durante el tráfico
 * normal de esta plataforma).
 *
 * LIMITACIÓN IMPORTANTE para producción a mayor escala: si despliegas
 * en varias instancias/regiones simultáneas, cada una lleva su propio
 * contador — un atacante podría repartir sus intentos entre instancias
 * y superar el límite real. Si eso llega a importar, sustituye este
 * archivo por un rate limiter respaldado por Redis (por ejemplo
 * `@upstash/ratelimit` + Upstash Redis, ambos con capa gratuita)
 * manteniendo la misma función `checkRateLimit`.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Limpieza periódica para no acumular memoria indefinidamente.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 5 * 60 * 1000);

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * @param key identificador único (ej. "login:email@ejemplo.com" o "login:1.2.3.4")
 * @param limit número máximo de intentos permitidos dentro de la ventana
 * @param windowMs duración de la ventana en milisegundos
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true };
}
