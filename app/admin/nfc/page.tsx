import type { Metadata } from "next";
import { listNfcTags, getNfcInventoryCounts } from "@/lib/queries/admin-nfc";
import { GenerateNfcPanel } from "@/components/admin/generate-nfc-panel";
import { NfcTable } from "@/components/admin/nfc-table";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Inventario NFC · Admin" };

const LABELS: Record<string, string> = {
  stock: "En stock",
  reserved: "Reservados",
  sold: "Vendidos",
  assigned: "Asignados",
  active: "Activos",
  disabled: "Deshabilitados",
};

export default async function AdminNfcPage() {
  const [rows, counts] = await Promise.all([listNfcTags(), getNfcInventoryCounts()]);
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 font-display text-2xl font-semibold text-ink-900">Inventario NFC</h1>
        <p className="text-sm text-ink-500">{total} NFC en total.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(LABELS).map(([key, label]) => (
          <Badge key={key} variant="outline">
            {label}: {counts[key] ?? 0}
          </Badge>
        ))}
      </div>

      <GenerateNfcPanel />

      <NfcTable rows={rows} />
    </div>
  );
}
