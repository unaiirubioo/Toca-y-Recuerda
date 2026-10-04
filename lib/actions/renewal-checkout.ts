"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { getSiteUrl } from "@/lib/site-url";
import { checkRateLimit } from "@/lib/security/rate-limit";

export type RenewalCheckoutResult = { error: string } | { url: string };

/**
 * Pago de renovación de un álbum concreto (spec #10): cobra lo mismo
 * que un álbum Premium normal (producto RENEWAL del catálogo) y, vía
 * `orders.renewal_album_id`, le dice al webhook de Stripe a qué álbum
 * hay que alargarle la fecha de conservación cuando se confirme el
 * pago — reutiliza el mismo webhook de siempre, sin tocar créditos de
 * álbum ni de NFC.
 */
export async function createRenewalCheckoutSession(albumId: string): Promise<RenewalCheckoutResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Tienes que iniciar sesión." };

  const limit = checkRateLimit(`renewal-checkout:${userData.user.id}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) return { error: "Demasiados intentos. Espera unos minutos." };

  // Solo el dueño del álbum puede renovarlo (RLS ya lo exige, pero lo
  // comprobamos explícitamente para dar un mensaje claro).
  const { data: album } = await supabase
    .from("albums")
    .select("id, title, owner_id")
    .eq("id", albumId)
    .eq("owner_id", userData.user.id)
    .maybeSingle();
  if (!album) return { error: "No hemos encontrado ese álbum." };

  const admin = createAdminClient();
  const { data: product } = await admin
    .from("products")
    .select("id, name, price_cents")
    .eq("slug", "RENEWAL")
    .eq("active", true)
    .maybeSingle();
  if (!product) return { error: "La renovación no está disponible ahora mismo. Contáctanos." };

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      user_id: userData.user.id,
      status: "pending",
      total_cents: (product as any).price_cents,
      renewal_album_id: albumId,
    })
    .select("id")
    .single();
  if (orderError || !order) return { error: "No hemos podido crear el pedido. Inténtalo otra vez." };
  const orderId = (order as any).id as string;

  await admin.from("order_items").insert({
    order_id: orderId,
    product_id: (product as any).id,
    quantity: 1,
    unit_price_cents: (product as any).price_cents,
  });

  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    console.error("createRenewalCheckoutSession: Stripe no configurado:", err);
    await admin.from("orders").delete().eq("id", orderId);
    return { error: "El pago no está disponible ahora mismo. Inténtalo más tarde." };
  }

  const siteUrl = getSiteUrl();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: userData.user.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: (product as any).price_cents,
            product_data: { name: `${(product as any).name} — "${(album as any).title}"` },
          },
        },
      ],
      metadata: { order_id: orderId },
      success_url: `${siteUrl}/checkout/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/album/renovar/${albumId}`,
    });

    await admin.from("orders").update({ stripe_checkout_session_id: session.id }).eq("id", orderId);

    if (!session.url) return { error: "No hemos podido abrir la pasarela de pago." };
    return { url: session.url };
  } catch (err) {
    console.error("createRenewalCheckoutSession:", err);
    await admin.from("orders").delete().eq("id", orderId);
    return { error: "No hemos podido conectar con Stripe. Inténtalo otra vez." };
  }
}
