import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tocayrecuerda.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/albumes",
        "/admin",
        "/onboarding",
        "/checkout",
        "/tienda/carrito",
        "/n/", // los NFC no configurados o privados nunca deben indexarse
        "/api/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
