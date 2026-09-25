import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tocayrecuerda.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/tienda`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/legal/privacidad`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/legal/terminos`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/legal/cookies`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/legal/aviso-legal`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Los álbumes privados NUNCA se indexan (spec #44).
  const admin = createAdminClient();
  const { data: albums } = await admin
    .from("albums")
    .select("public_slug, updated_at")
    .eq("status", "published")
    .eq("privacy", "public")
    .limit(1000);

  const albumRoutes: MetadataRoute.Sitemap = ((albums as any[]) ?? []).map((a) => ({
    url: `${SITE_URL}/album/${a.public_slug}`,
    lastModified: a.updated_at,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...albumRoutes];
}
