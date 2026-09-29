import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Da de alta lo que incluye cada línea de un pedido ya marcado como
 * pagado: créditos de álbum y/o reserva de NFC físico. Se usa tanto
 * desde el webhook de Stripe (compra real) como desde /admin al
 * regalar un pack a un usuario — la lógica es idéntica en ambos casos,
 * lo único que cambia es cómo se creó el pedido.
 */
export async function fulfillPaidOrder(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string,
  userId: string
): Promise<void> {
  const { data: items } = await admin
    .from("order_items")
    .select("quantity, products ( id, album_credits, nfc_credits, photo_limit, video_limit, storage_limit_mb )")
    .eq("order_id", orderId);

  for (const item of (items as any[]) ?? []) {
    const product = item.products;
    if (!product) continue;

    for (let i = 0; i < item.quantity; i++) {
      if (product.album_credits > 0) {
        for (let c = 0; c < product.album_credits; c++) {
          await admin.from("album_credits").insert({
            user_id: userId,
            source_order_id: orderId,
            photo_limit: product.photo_limit ?? 500,
            video_limit: product.video_limit ?? 20,
            storage_limit_mb: product.storage_limit_mb ?? 5120,
          });
        }
      }

      if (product.nfc_credits > 0) {
        for (let c = 0; c < product.nfc_credits; c++) {
          await admin.from("nfc_credits").insert({ user_id: userId, source_order_id: orderId });

          const { data: reservedId } = await admin.rpc("reserve_nfc_tag", {
            p_owner_id: userId,
            p_order_id: orderId,
          });

          if (reservedId) {
            await admin.from("nfc_fulfillment").insert({
              nfc_id: reservedId,
              order_id: orderId,
              status: "pendiente",
            });
          }
          // Si no hay stock, el crédito NFC queda igualmente registrado;
          // un administrador podrá generar más NFC y asignarlos después.
        }
      }
    }
  }
}
