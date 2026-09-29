"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/security/require-admin";
import { fulfillPaidOrder } from "@/lib/fulfillment/fulfill-order";

export type RevokeGiftResult =
  | { error: string }
  | { ok: true; albumCreditsRemoved: number; nfcReleased: number; nfcKept: number };

/**
 * Deshace un regalo hecho por error o que el usuario ya no debe tener
 * (spec: "¿se puede quitar?"). Solo actúa sobre pedidos marcados como
 * regalo (is_gift) — nunca sobre una compra real de Stripe, para que
 * esto no sirva nunca como forma de "cancelar" un pago de verdad.
 *
 * Solo retira lo que el usuario no ha llegado a usar todavía:
 * - Créditos de álbum aún no consumidos (no usados para crear/premium
 *   un álbum) se eliminan.
 * - NFC reservados de este pedido que todavía no están vinculados a
 *   ningún álbum vuelven al stock, listos para otra venta.
 * Lo que ya está en uso (un álbum ya creado con ese crédito, un NFC ya
 * pegado a un álbum) se queda como está — quitarlo a medio uso
 * rompería el recuerdo de alguien, así que el admin lo ve reflejado en
 * la respuesta en vez de perderlo en silencio.
 */
export async function revokeGiftFromUser(orderId: string): Promise<RevokeGiftResult> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, is_gift, status")
    .eq("id", orderId)
    .maybeSingle();

  const o = order as any;
  if (!o) return { error: "Ese pedido no existe." };
  if (!o.is_gift) return { error: "Solo se pueden quitar regalos, no compras reales." };
  if (o.status === "refunded") return { error: "Ese regalo ya se había quitado." };

  // 1) Créditos de álbum no usados todavía.
  const { data: removedCredits } = await admin
    .from("album_credits")
    .delete()
    .eq("source_order_id", orderId)
    .eq("consumed", false)
    .select("id");

  // 2) NFC reservados de este pedido, solo los que aún no están en un álbum.
  const { data: tags } = await admin
    .from("nfc_tags")
    .select("id, album_id")
    .eq("order_id", orderId);

  let nfcReleased = 0;
  let nfcKept = 0;

  for (const tag of (tags as any[]) ?? []) {
    if (tag.album_id) {
      nfcKept += 1;
      continue;
    }
    await admin
      .from("nfc_tags")
      .update({ status: "stock", owner_id: null, order_id: null })
      .eq("id", tag.id);
    await admin.from("nfc_fulfillment").delete().eq("nfc_id", tag.id).eq("order_id", orderId);
    nfcReleased += 1;
  }

  // El crédito NFC en sí solo se borra si el chip que representaba
  // volvió al stock; si ya estaba en un álbum, se deja consumido.
  await admin
    .from("nfc_credits")
    .delete()
    .eq("source_order_id", orderId)
    .eq("consumed", false);

  await admin.from("orders").update({ status: "refunded" }).eq("id", orderId);

  revalidatePath(`/admin/usuarios`);
  revalidatePath("/admin/pedidos");

  return {
    ok: true,
    albumCreditsRemoved: (removedCredits as any[])?.length ?? 0,
    nfcReleased,
    nfcKept,
  };
}

export type GrantProductResult = { error: string } | { ok: true };

/**
 * (spec: un admin puede darle a alguien 1 álbum, el pack de 3, etc.,
 * a mano). Crea un pedido "pagado" de 0 € marcado como regalo
 * (is_gift=true) y reutiliza exactamente el mismo reparto de créditos
 * que usa un pago real por Stripe, así el usuario lo ve en su
 * historial de compras como cualquier otro pedido.
 */
export async function grantProductToUser(userId: string, productSlug: string): Promise<GrantProductResult> {
  const { userId: adminId } = await requireAdmin();
  const admin = createAdminClient();

  const { data: product } = await admin
    .from("products")
    .select("id, price_cents")
    .eq("slug", productSlug)
    .eq("active", true)
    .maybeSingle();

  if (!product) return { error: "Ese producto no existe o no está activo." };

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      user_id: userId,
      status: "paid",
      total_cents: 0,
      is_gift: true,
      granted_by: adminId,
    })
    .select("id")
    .single();

  if (orderError || !order) return { error: "No hemos podido crear el pedido de regalo." };

  const { error: itemError } = await admin.from("order_items").insert({
    order_id: (order as any).id,
    product_id: (product as any).id,
    quantity: 1,
    unit_price_cents: 0,
  });

  if (itemError) return { error: "No hemos podido añadir el producto al pedido de regalo." };

  await fulfillPaidOrder(admin, (order as any).id, userId);

  revalidatePath(`/admin/usuarios/${userId}`);
  revalidatePath("/admin/pedidos");
  return { ok: true };
}
