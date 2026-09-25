"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/admin/copy-button";
import { setNfcStatus } from "@/lib/actions/admin-nfc";
import type { NfcRow } from "@/lib/queries/admin-nfc";

const STATUS_LABELS: Record<NfcRow["status"], string> = {
  stock: "En stock",
  reserved: "Reservado",
  sold: "Vendido",
  assigned: "Asignado",
  active: "Activo",
  disabled: "Deshabilitado",
};

const STATUS_VARIANT: Record<NfcRow["status"], "neutral" | "premium" | "success" | "outline"> = {
  stock: "outline",
  reserved: "neutral",
  sold: "neutral",
  assigned: "premium",
  active: "success",
  disabled: "outline",
};

export function NfcTable({ rows }: { rows: NfcRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function changeStatus(id: string, status: NfcRow["status"]) {
    startTransition(async () => {
      await setNfcStatus(id, status);
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return <p className="text-sm text-ink-500">Todavía no has generado ningún NFC.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-soft">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
            <th className="px-4 py-3">Token</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Propietario</th>
            <th className="px-4 py-3">Álbum</th>
            <th className="px-4 py-3">Escaneos</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-ink-50 last:border-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs text-ink-700">{row.publicToken}</span>
                  <CopyButton value={row.url} label="" />
                </div>
              </td>
              <td className="px-4 py-3">
                <select
                  value={row.status}
                  disabled={pending}
                  onChange={(e) => changeStatus(row.id, e.target.value as NfcRow["status"])}
                  className="rounded-lg border border-ink-100 bg-white px-2 py-1 text-xs focus-ring"
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <Badge variant={STATUS_VARIANT[row.status]} className="ml-2 hidden sm:inline">
                  {STATUS_LABELS[row.status]}
                </Badge>
              </td>
              <td className="px-4 py-3 text-ink-700">{row.ownerName ?? "—"}</td>
              <td className="px-4 py-3 text-ink-700">{row.albumTitle ?? "—"}</td>
              <td className="px-4 py-3 text-ink-500">{row.scanCount}</td>
              <td className="px-4 py-3">
                <a
                  href={row.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-amber-600 hover:underline"
                >
                  Probar <ExternalLink className="h-3 w-3" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
