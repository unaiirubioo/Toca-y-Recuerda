import { headers } from "next/headers";

/** Best-effort: en Vercel, x-forwarded-for lleva la IP real del visitante. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return (forwarded.split(",")[0] ?? forwarded).trim();
  return h.get("x-real-ip") ?? "unknown";
}
