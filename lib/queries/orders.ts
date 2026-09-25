import { createClient } from "@/lib/supabase/server";

export type CompletedOrder = {
  status: string;
  items: { name: string; quantity: number; albumCredits: number; nfcCredits: number }[];
};

export async function getOrderByCheckoutSession(sessionId: string): Promise<CompletedOrder | null> {
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("status, order_items ( quantity, products ( name, album_credits, nfc_credits ) )")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (!order) return null;
  const o = order as any;

  return {
    status: o.status,
    items: (o.order_items ?? []).map((item: any) => ({
      name: item.products?.name ?? "Producto",
      quantity: item.quantity,
      albumCredits: item.products?.album_credits ?? 0,
      nfcCredits: item.products?.nfc_credits ?? 0,
    })),
  };
}
