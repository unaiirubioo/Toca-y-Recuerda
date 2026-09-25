import { createClient } from "@/lib/supabase/server";

export type MyOrder = {
  id: string;
  status: "pending" | "paid" | "failed" | "refunded";
  totalCents: number;
  createdAt: string;
  products: { name: string; quantity: number }[];
};

/** Los pedidos del propio usuario — RLS (orders_owner_read) ya basta, sin necesidad del cliente admin. */
export async function getMyOrders(userId: string): Promise<MyOrder[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select("id, status, total_cents, created_at, order_items ( quantity, products ( name ) )")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return ((data as any[]) ?? []).map((o) => ({
    id: o.id,
    status: o.status,
    totalCents: o.total_cents,
    createdAt: o.created_at,
    products: (o.order_items ?? []).map((item: any) => ({
      name: item.products?.name ?? "Producto",
      quantity: item.quantity,
    })),
  }));
}
