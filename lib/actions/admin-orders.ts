"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type FulfillmentStatus = "pendiente" | "preparando" | "programado" | "enviado" | "entregado";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("No autenticado.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
  if ((profile as any)?.role !== "admin") throw new Error("No autorizado.");
}

/** Cambia el estado de un único NFC dentro de un pedido (spec #22). */
export async function setFulfillmentStatus(fulfillmentId: string, status: FulfillmentStatus): Promise<void> {
  await assertAdmin();
  const admin = createAdminClient();
  await admin.from("nfc_fulfillment").update({ status }).eq("id", fulfillmentId);
  revalidatePath("/admin/pedidos");
}

/** Cambia de una vez el estado de todos los NFC de un pedido (acción rápida habitual: "todo el pedido enviado"). */
export async function setOrderFulfillmentStatus(orderId: string, status: FulfillmentStatus): Promise<void> {
  await assertAdmin();
  const admin = createAdminClient();
  await admin.from("nfc_fulfillment").update({ status }).eq("order_id", orderId);
  revalidatePath("/admin/pedidos");
}
