"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/admin/copy-button";
import { formatEuros } from "@/lib/format";
import { setFulfillmentStatus, setOrderFulfillmentStatus } from "@/lib/actions/admin-orders";
import type { AdminOrder } from "@/lib/queries/admin-orders";

const FULFILLMENT_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  preparando: "Preparando",
  programado: "Programado",
  enviado: "Enviado",
  entregado: "Entregado",
};

const ORDER_STATUS_VARIANT: Record<AdminOrder["status"], "neutral" | "success" | "warning" | "danger"> = {
  pending: "warning",
  paid: "success",
  failed: "danger",
  refunded: "neutral",
};

const ORDER_STATUS_LABELS: Record<AdminOrder["status"], string> = {
  pending: "Pendiente de pago",
  paid: "Pagado",
  failed: "Fallido",
  refunded: "Reembolsado",
};

export function OrdersTable({ orders }: { orders: AdminOrder[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function changeAll(orderId: string, status: string) {
    startTransition(async () => {
      await setOrderFulfillmentStatus(orderId, status as any);
      router.refresh();
    });
  }

  function changeOne(fulfillmentId: string, status: string) {
    startTransition(async () => {
      await setFulfillmentStatus(fulfillmentId, status as any);
      router.refresh();
    });
  }

  if (orders.length === 0) {
    return <p className="text-sm text-ink-500">Todavía no hay pedidos.</p>;
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="rounded-2xl bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-ink-900">
                {order.customerName ?? "Sin nombre"}{" "}
                <span className="text-sm text-ink-500">· {order.customerEmail}</span>
              </p>
              <p className="text-xs text-ink-500">
                {new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(
                  new Date(order.createdAt)
                )}
              </p>
            </div>
            <div className="text-right">
              <Badge variant={ORDER_STATUS_VARIANT[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
              <p className="mt-1 font-display text-lg font-semibold text-ink-900">
                {formatEuros(order.totalCents)}
              </p>
            </div>
          </div>

          <ul className="mt-3 text-sm text-ink-700">
            {order.products.map((p, i) => (
              <li key={i}>
                {p.quantity}× {p.name}
              </li>
            ))}
          </ul>

          {order.shippingAddress && (
            <p className="mt-2 text-sm text-ink-500">
              📦 {order.shippingAddress.fullName} — {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}, {order.shippingAddress.city}{" "}
              {order.shippingAddress.postalCode}, {order.shippingAddress.country}
            </p>
          )}

          {order.nfcItems.length > 0 && (
            <div className="mt-4 rounded-xl bg-cream-100 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1 text-sm font-medium text-ink-900">
                  <Package className="h-4 w-4" /> NFC de este pedido
                </p>
                <select
                  disabled={pending}
                  defaultValue=""
                  onChange={(e) => e.target.value && changeAll(order.id, e.target.value)}
                  className="rounded-lg border border-ink-100 bg-white px-2 py-1 text-xs focus-ring"
                >
                  <option value="" disabled>
                    Cambiar todos a…
                  </option>
                  {Object.entries(FULFILLMENT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <ul className="space-y-2">
                {order.nfcItems.map((item) => (
                  <li key={item.fulfillmentId} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-1 font-mono text-xs text-ink-700">
                      {item.publicToken}
                      <CopyButton value={item.url} label="" />
                    </span>
                    <select
                      value={item.status}
                      disabled={pending}
                      onChange={(e) => changeOne(item.fulfillmentId, e.target.value)}
                      className="rounded-lg border border-ink-100 bg-white px-2 py-1 text-xs focus-ring"
                    >
                      {Object.entries(FULFILLMENT_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
