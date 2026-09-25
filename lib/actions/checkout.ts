"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { checkRateLimit } from "@/lib/security/rate-limit";

export type CheckoutInput = { productId: string; quantity: number }[];
export type CheckoutResult = { error: string } | { url: string };

export async function createCheckoutSession(cart: CheckoutInput): Promise<CheckoutResult> {
  if (cart.length === 0) return { error: "Tu carrito está vacío." };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Tienes que iniciar sesión para pagar." };

  const limit = checkRateLimit(`checkout:${userData.user.id}`, 20, 60 * 60 * 1000);
  if (!limit.allowed) {
    return { error: "Demasiados intentos de pago. Espera unos minutos e inténtalo otra vez." };
  }

  // orders/order_items nunca deben ser insertables directamente por el
  // usuario (spec #21: el total lo calcula el servidor, no el
  // navegador) — no existe ninguna política RLS que lo permita a
  // propósito. Esta función ya valida todo lo necesario en código antes
  // de escribir, así que usa el cliente admin para las escrituras.
  const admin = createAdminClient();

  // Precios recalculados desde la base de datos: NUNCA se confía en el
  // precio que venga del carrito del navegador (spec #10/#45). Esta
  // lectura sí puede ir con el cliente normal: los productos activos
  // son de lectura pública.
  const productIds = cart.map((i) => i.productId);
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, price_cents, nfc_credits, active")
    .in("id", productIds);

  if (productsError || !products || products.length === 0) {
    return { error: "No hemos podido validar tu carrito. Inténtalo otra vez." };
  }

  const productById = new Map((products as any[]).map((p) => [p.id, p]));

  for (const item of cart) {
    const product = productById.get(item.productId);
    if (!product || !product.active) {
      return { error: "Alguno de los productos de tu carrito ya no está disponible." };
    }
  }

  let totalCents = 0;
  let needsShipping = false;

  const orderItemsPayload = cart.map((item) => {
    const product = productById.get(item.productId)!;
    const quantity = Math.max(1, Math.min(item.quantity, 20));
    totalCents += product.price_cents * quantity;
    if (product.nfc_credits > 0) needsShipping = true;
    return { product, quantity };
  });

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({ user_id: userData.user.id, status: "pending", total_cents: totalCents })
    .select("id")
    .single();

  if (orderError || !order) return { error: "No hemos podido crear tu pedido. Inténtalo otra vez." };
  const orderId = (order as any).id as string;

  await admin.from("order_items").insert(
    orderItemsPayload.map(({ product, quantity }) => ({
      order_id: orderId,
      product_id: product.id,
      quantity,
      unit_price_cents: product.price_cents,
    }))
  );

  const stripe = getStripe();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: userData.user.email ?? undefined,
      // No se especifica payment_method_types ni automatic_payment_methods
      // a propósito: para Checkout Sessions (a diferencia de Payment
      // Intents), omitir el campo hace que Stripe muestre
      // automáticamente cualquier método que tengas activado en tu
      // panel (Settings → Payment methods) — tarjeta, Bizum, Apple Pay,
      // Google Pay — sin tener que listarlos ni mantenerlos aquí.
      line_items: orderItemsPayload.map(({ product, quantity }) => ({
        quantity,
        price_data: {
          currency: "eur",
          unit_amount: product.price_cents,
          product_data: { name: product.name },
        },
      })),
      ...(needsShipping
        ? { shipping_address_collection: { allowed_countries: ["ES", "PT", "FR", "AD"] } }
        : {}),
      metadata: { order_id: orderId },
      success_url: `${siteUrl}/checkout/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/tienda/carrito`,
    });

    await admin.from("orders").update({ stripe_checkout_session_id: session.id }).eq("id", orderId);

    if (!session.url) return { error: "No hemos podido abrir la pasarela de pago." };
    return { url: session.url };
  } catch {
    // Si Stripe falla, no dejamos un pedido "pending" huérfano rondando.
    await admin.from("orders").delete().eq("id", orderId);
    return { error: "No hemos podido conectar con Stripe. Inténtalo otra vez." };
  }
}
