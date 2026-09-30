import { requireAdmin } from "@/lib/security/require-admin";
import { createClient } from "@/lib/supabase/server";
import { buildNfcUrl } from "@/lib/nfc";

export type NfcRow = {
  id: string;
  publicToken: string;
  url: string;
  status: "stock" | "reserved" | "sold" | "assigned" | "active" | "disabled";
  ownerName: string | null;
  albumTitle: string | null;
  albumId: string | null;
  scanCount: number;
  createdAt: string;
  selfGenerated: boolean;
};

export async function listNfcTags(): Promise<NfcRow[]> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("nfc_tags")
    .select(
      `
      id, public_token, status, scan_count, created_at, self_generated,
      profiles ( full_name ),
      albums ( id, title )
      `
    )
    .order("created_at", { ascending: false })
    .limit(200);

  // Antes esto se tragaba el error en silencio y devolvía la lista
  // vacía sin más — si falta la migración 0006 (columna
  // self_generated), la consulta entera fallaba y el panel parecía
  // "no tener ningún NFC", incluidos los del stock físico de siempre.
  if (error) {
    console.error("listNfcTags:", error.message);
    return [];
  }
  if (!data) return [];

  return (data as any[]).map((row) => ({
    id: row.id,
    publicToken: row.public_token,
    url: buildNfcUrl(row.public_token),
    status: row.status,
    ownerName: row.profiles?.full_name ?? null,
    albumTitle: row.albums?.title ?? null,
    albumId: row.albums?.id ?? null,
    scanCount: row.scan_count,
    createdAt: row.created_at,
    selfGenerated: !!row.self_generated,
  }));
}

export async function getNfcInventoryCounts(): Promise<Record<string, number>> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("nfc_tags").select("status, self_generated");
  if (error) console.error("getNfcInventoryCounts:", error.message);

  const counts: Record<string, number> = {};
  for (const row of (data as any[]) ?? []) {
    // Los autogenerados por el propio usuario son gratis (spec: no
    // cuentan como "vendidos" — antes se metían en el mismo cubo que
    // una venta real de Stripe, dando una cifra de ventas falsa).
    const key = row.self_generated ? "self_generated" : row.status;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
