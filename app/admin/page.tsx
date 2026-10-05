import type { Metadata } from "next";
import { Users, Image as ImageIcon, Crown, Euro, Nfc, HardDrive } from "lucide-react";
import { getAdminMetrics } from "@/lib/queries/admin-metrics";
import { MetricCard } from "@/components/admin/metric-card";
import { SimpleBarChart } from "@/components/admin/simple-bar-chart";
import { RecalculateCountersButton } from "@/components/admin/recalculate-counters-button";
import { formatEuros, formatMb } from "@/lib/format";

export const metadata: Metadata = { title: "Métricas · Admin" };

const NFC_LABELS: Record<string, string> = {
  stock: "En stock",
  reserved: "Reservados",
  sold: "Vendidos",
  assigned: "Asignados",
  active: "Activos",
  disabled: "Deshabilitados",
};

export default async function AdminDashboardPage() {
  const metrics = await getAdminMetrics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Métricas</h1>
        <p className="text-sm text-ink-500">La foto general de toda la plataforma, de un vistazo.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <MetricCard label="Usuarios" value={String(metrics.totalUsers)} icon={Users} color="ink" />
        <MetricCard label="Álbumes totales" value={String(metrics.totalAlbums)} icon={ImageIcon} color="ink" />
        <MetricCard
          label="Álbumes comprados"
          value={String(metrics.premiumAlbums)}
          hint={`${metrics.freeAlbums} gratis`}
          icon={Crown}
          color="amber"
        />
        <MetricCard label="NFC totales" value={String(metrics.totalNfc)} icon={Nfc} color="ink" />
        <MetricCard
          label="NFC comprados"
          value={String(metrics.purchasedNfc)}
          hint={`${metrics.freeNfc} autogenerados gratis`}
          icon={Nfc}
          color="amber"
        />
        <MetricCard
          label="Almacenamiento usado"
          value={formatMb(Math.round(metrics.totalStorageMb))}
          icon={HardDrive}
          color="ink"
        />
        <MetricCard
          label="Ingresos por álbumes"
          value={formatEuros(metrics.revenueAlbumsCents)}
          icon={Euro}
          color="success"
        />
        <MetricCard
          label="Ingresos por NFC"
          value={formatEuros(metrics.revenueNfcCents)}
          icon={Euro}
          color="success"
        />
        <MetricCard
          label="Ingresos totales"
          value={formatEuros(metrics.totalRevenueCents)}
          icon={Euro}
          color="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SimpleBarChart
          title="Álbumes por plan"
          data={[
            { label: "Gratis", value: metrics.freeAlbums, color: "#8C9BAC" },
            { label: "Premium", value: metrics.premiumAlbums, color: "#D8933B" },
          ]}
        />
        <SimpleBarChart
          title="NFC por estado"
          data={Object.entries(NFC_LABELS).map(([key, label]) => ({
            label,
            value: metrics.nfcByStatus[key] ?? 0,
          }))}
        />
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-soft">
        <h2 className="mb-1 font-display text-base font-semibold text-ink-900">Mantenimiento</h2>
        <p className="mb-3 text-sm text-ink-500">
          Los contadores de fotos/vídeos/almacenamiento de cada álbum se
          actualizan a mano en cada operación; si alguna vez ves un
          número que no cuadra, recalcúlalos aquí a partir de los
          archivos reales.
        </p>
        <RecalculateCountersButton />
      </div>
    </div>
  );
}
