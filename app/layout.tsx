import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "@/styles/globals.css";
import { CartProvider } from "@/lib/cart-context";

// Antes, "Inter" y "Fraunces" solo estaban referenciadas por nombre en
// globals.css sin cargarse de verdad — el sitio caía silenciosamente
// al tipo de letra del sistema. next/font las descarga en build time,
// las autohospeda (sin llamada a Google Fonts en producción) y expone
// las variables CSS que globals.css ya esperaba.
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });

const siteName = "Toca y Recuerda";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tocayrecuerda.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl || 'https://toca-y-recuerda.vercel.app'),
  title: {
    default: `${siteName} — Convierte tus recuerdos en algo que puedas tocar`,
    template: `%s · ${siteName}`,
  },
  description:
    "Guarda tus viajes, fotos y momentos especiales en un álbum digital y accede a ellos acercando tu móvil a tu recuerdo.",
  openGraph: {
    siteName,
    type: "website",
    locale: "es_ES",
    images: [{ url: "/logo.jpeg", width: 1024, height: 1024, alt: siteName }],
  },
  twitter: {
    card: "summary",
    title: `${siteName} — Convierte tus recuerdos en algo que puedas tocar`,
    images: ["/logo.jpeg"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
