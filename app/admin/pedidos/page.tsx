import type { Metadata } from "next";
import { listOrders } from "@/lib/queries/admin-orders";
import { OrdersTable } from "@/components/admin/orders-table";

export const metadata: Metadata = { title: "Pedidos · Admin" };

export default async function AdminOrdersPage() {
  const orders = await listOrders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 font-display text-2xl font-semibold text-ink-900">Pedidos</h1>
        <p className="text-sm text-ink-500">{orders.length} pedidos.</p>
      </div>
      <OrdersTable orders={orders} />
    </div>
  );
}
