/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // no anunciar innecesariamente que corre sobre Next.js
  images: {
    remotePatterns: [
      {
        // Supabase Storage: sustituir <PROJECT_REF> se resuelve automáticamente
        // a partir de NEXT_PUBLIC_SUPABASE_URL en tiempo de build si se desea
        // restringir más. Por defecto permitimos cualquier *.supabase.co.
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb", // las subidas de archivos grandes van directas a Storage, no por Server Actions
    },
  },
  // Cabeceras de seguridad HTTP básicas (spec #45), aplicadas a toda la app.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" }, // evita que el álbum se incruste en un iframe ajeno (clickjacking)
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
