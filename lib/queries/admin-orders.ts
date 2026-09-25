import { createAdminClient } from "@/lib/supabase/admin";
import { buildNfcUrl } from "@/lib/nfc";

export type AdminOrderFulfillmentItem = {
  fulfillmentId: string;
  nfcId: string;
  publicToken: string;
  url: string;
  status: "pendiente" | "preparando" | "programado" | "enviado" | "entregado";
};

export type AdminOrder = {
  id: string;
  status: "pending" | "paid" | "failed" | "refunded";
  totalCents: number;
  createdAt: string;
  customerName: string | null;
  customerEmail: string | null;
  products: { name: string; quantity: number }[];
  shippingAddress: {
    fullName: string;
    line1: string;
    line2: string | null;
    city: string;
    postalCode: string;
    country: string;
  } | null;
  nfcItems: AdminOrderFulfillmentItem[];
};

export async function listOrders(): Promise<AdminOrder[]> {
  const admin = createAdminClient();

  const { data: orders } = await admin
    .from("orders")
    .select(
      `
      id, status, total_cents, created_at, user_id,
      shipping_addresses ( full_name, line1, line2, city, postal_code, country ),
      order_items ( quantity, products ( name ) ),
      nfc_fulfillment ( id, status, nfc_tags ( id, public_token ) )
      `
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (!orders) return [];

  const userIds = Array.from(new Set((orders as any[]).map((o) => o.user_id)));
  const [{ data: profiles }, usersResult] = await Promise.all([
    admin.from("profiles").select("id, full_name").in("id", userIds),
    Promise.all(userIds.map((id) => admin.auth.admin.getUserById(id))),
  ]);

  const nameById = new Map((profiles as any[])?.map((p) => [p.id, p.full_name]) ?? []);
  const emailById = new Map(
    usersResult.map((res, i) => [userIds[i], res.data.user?.email ?? null])
  );

  return (orders as any[]).map((o) => ({
    id: o.id,
    status: o.status,
    totalCents: o.total_cents,
    createdAt: o.created_at,
    customerName: nameById.get(o.user_id) ?? null,
    customerEmail: emailById.get(o.user_id) ?? null,
    products: (o.order_items ?? []).map((item: any) => ({
      name: item.products?.name ?? "Producto",
      quantity: item.quantity,
    })),
    shippingAddress: o.shipping_addresses
      ? {
          fullName: o.shipping_addresses.full_name,
          line1: o.shipping_addresses.line1,
          line2: o.shipping_addresses.line2,
          city: o.shipping_addresses.city,
          postalCode: o.shipping_addresses.postal_code,
          country: o.shipping_addresses.country,
        }
      : null,
    nfcItems: (o.nfc_fulfillment ?? []).map((f: any) => ({
      fulfillmentId: f.id,
      nfcId: f.nfc_tags?.id,
      publicToken: f.nfc_tags?.public_token ?? "",
      url: f.nfc_tags?.public_token ? buildNfcUrl(f.nfc_tags.public_token) : "",
      status: f.status,
    })),
  }));
}
