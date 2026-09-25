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
};

export async function listNfcTags(): Promise<NfcRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("nfc_tags")
    .select(
      `
      id, public_token, status, scan_count, created_at,
      profiles ( full_name ),
      albums ( id, title )
      `
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) return [];

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
  }));
}

export async function getNfcInventoryCounts(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("nfc_tags").select("status");
  const counts: Record<string, number> = {};
  for (const row of (data as any[]) ?? []) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return counts;
}
