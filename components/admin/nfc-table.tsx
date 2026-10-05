"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Trash2, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/admin/copy-button";
import { setNfcStatus, deleteNfcTag } from "@/lib/actions/admin-nfc";
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function changeStatus(id: string, status: NfcRow["status"]) {
    startTransition(async () => {
      await setNfcStatus(id, status);
      router.refresh();
    });
  }

  function remove(row: NfcRow) {
    const warning = row.albumId
      ? `Este NFC está vinculado al álbum "${row.albumTitle}". Si lo eliminas, ese álbum dejará de abrirse desde ese chip. ¿Seguro?`
      : "¿Eliminar este NFC del inventario? No se puede deshacer.";
    if (!confirm(warning)) return;

    setError(null);
    setDeletingId(row.id);
    startTransition(async () => {
      const result = await deleteNfcTag(row.id);
      setDeletingId(null);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-100 bg-white p-8 text-center text-sm text-ink-500">
        Todavía no hay ningún NFC generado.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100/70 bg-white shadow-soft">
      {error && <p className="border-b border-danger/20 bg-danger/5 px-4 py-2 text-sm text-danger">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-cream-100/60 text-left text-xs uppercase tracking-wide text-ink-500">
              <th className="px-4 py-3 font-medium">Token</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Origen</th>
              <th className="px-4 py-3 font-medium">Propietario</th>
              <th className="px-4 py-3 font-medium">Álbum</th>
              <th className="px-4 py-3 font-medium">Escaneos</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-ink-50 last:border-0 hover:bg-cream-100/40">
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
                <td className="px-4 py-3">
                  {row.selfGenerated ? (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                      <UserRound className="h-3.5 w-3.5" /> Autogenerado
                    </span>
                  ) : (
                    <span className="text-xs text-ink-500">Inventario propio</span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-700">{row.ownerName ?? "—"}</td>
                <td className="px-4 py-3 text-ink-700">{row.albumTitle ?? "—"}</td>
                <td className="px-4 py-3 text-ink-500">{row.scanCount}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-amber-600 hover:bg-amber-500/10"
                    >
                      Probar <ExternalLink className="h-3 w-3" />
                    </a>
                    <button
                      type="button"
                      onClick={() => remove(row)}
                      disabled={pending && deletingId === row.id}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-danger hover:bg-danger/10 focus-ring disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deletingId === row.id ? "Eliminando…" : "Eliminar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
