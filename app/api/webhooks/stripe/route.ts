import { NextResponse, type NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { shouldSkipOrderFulfillment } from "@/lib/business/order-idempotency";
import { fulfillPaidOrder } from "@/lib/fulfillment/fulfill-order";
import { computeRenewalDueDate } from "@/lib/business/renewal";

// Los webhooks de Stripe llegan sin sesión de usuario, así que esta
// ruta usa siempre el cliente admin (service_role) — es el único sitio
// del backend con permiso para crear créditos y marcar pedidos como
// pagados sin pasar por RLS.
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Firma inválida." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Idempotencia ATÓMICA (spec #74): antes se comprobaba con un SELECT
  // y LUEGO se insertaba — dos pasos separados, así que dos entregas
  // simultáneas del mismo evento (Stripe reenvía a veces) podían pasar
  // ambas el SELECT antes de que ninguna insertara. Ahora se intenta
  // insertar directamente: si la clave ya existe, la propia base de
  // datos lo rechaza con un error de violación de unicidad (23505), y
  // eso es la señal de "ya procesado", sin ninguna ventana de carrera.
  const { error: insertEventError } = await admin
    .from("stripe_webhook_events")
    .insert({ id: event.id, type: event.type });

  if (insertEventError) {
    if (insertEventError.code === "23505") {
      return NextResponse.json({ received: true, deduped: true });
    }
    console.error("webhook: no se pudo registrar el evento", insertEventError);
    // Error real (no de duplicado): devolvemos 500 para que Stripe reintente.
    return NextResponse.json({ error: "No se pudo registrar el evento." }, { status: 500 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as import("stripe").Stripe.Checkout.Session;
    await handleCheckoutCompleted(session);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: import("stripe").Stripe.Checkout.Session) {
  const admin = createAdminClient();
  const orderId = session.metadata?.order_id;
  if (!orderId) return;

  const { data: order } = await admin
    .from("orders")
    .select("id, user_id, status, renewal_album_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;

  const o = order as any;
  // Segunda capa de idempotencia: si ya estaba pagado, no lo procesamos dos veces.
  if (shouldSkipOrderFulfillment(o.status)) return;

  let shippingAddressId: string | null = null;
  const shipping = (session as any).shipping_details ?? (session as any).customer_details;
  if (shipping?.address) {
    const { data: addr } = await admin
      .from("shipping_addresses")
      .insert({
        user_id: o.user_id,
        full_name: shipping.name ?? "",
        line1: shipping.address.line1 ?? "",
        line2: shipping.address.line2 ?? null,
        city: shipping.address.city ?? "",
        province: shipping.address.state ?? null,
        postal_code: shipping.address.postal_code ?? "",
        country: shipping.address.country ?? "ES",
      })
      .select("id")
      .single();
    shippingAddressId = (addr as any)?.id ?? null;
  }

  // Marcar como pagado es también parte de la idempotencia: si dos
  // invocaciones llegaran a la vez tras el insert atómico de arriba
  // (no debería, pero por si acaso), esta actualización sigue siendo
  // la última palabra sobre "ya está pagado" antes de crear créditos.
  await admin
    .from("orders")
    .update({
      status: "paid",
      stripe_payment_intent_id: (session.payment_intent as string) ?? null,
      ...(shippingAddressId ? { shipping_address_id: shippingAddressId } : {}),
    })
    .eq("id", orderId)
    .eq("status", "pending"); // solo transiciona pending -> paid, nunca dos veces

  await admin.from("payments").insert({
    order_id: orderId,
    stripe_payment_intent_id: (session.payment_intent as string) ?? session.id,
    amount_cents: session.amount_total ?? 0,
    currency: (session.currency ?? "eur").toUpperCase(),
    status: "succeeded",
    raw_event: session as any,
  });

  // Autodetección de lo que incluye cada producto (spec #57): por cada
  // línea del pedido, según el producto, se crean créditos de álbum y/o
  // se reserva stock de NFC físico.
  await fulfillPaidOrder(admin, orderId, o.user_id);

  // Pago de renovación (spec #10): este pedido no da créditos nuevos
  // (el producto RENEWAL los tiene a 0 a propósito), solo alarga la
  // fecha de conservación del álbum concreto que lo generó.
  if (o.renewal_album_id) {
    await admin
      .from("albums")
      .update({
        renewal_due_at: computeRenewalDueDate(new Date()).toISOString(),
        renewal_reminder_sent_at: null,
      })
      .eq("id", o.renewal_album_id);
  }
}
