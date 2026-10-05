import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";

/**
 * Nominatim (el geocodificador gratuito de OpenStreetMap, mismo
 * proveedor que ya usamos para los mapas) exige un User-Agent que
 * identifique la aplicación — el navegador no deja fijar esa cabecera
 * desde el cliente, así que esta ruta hace de intermediaria.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 3) return NextResponse.json({ results: [] });

  const ip = await getClientIp();
  const limit = checkRateLimit(`geocode:${ip}`, 30, 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ results: [] });

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "0");

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "TocaYRecuerda/1.0 (https://tocayrecuerda.com)",
        "Accept-Language": "es",
      },
      // Nominatim pide no cachear agresivamente, pero un minuto está bien
      // para no repetir la misma búsqueda mientras el usuario teclea.
      next: { revalidate: 60 },
    });

    if (!res.ok) return NextResponse.json({ results: [] });

    const data = (await res.json()) as { display_name: string; lat: string; lon: string }[];
    const results = data.map((r) => ({
      label: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
