/** Si el evento de Stripe ya está registrado en stripe_webhook_events, nunca se reprocesa. */
export function shouldSkipWebhookEvent(alreadyRecorded: boolean): boolean {
  return alreadyRecorded;
}

/** Un pedido ya pagado nunca vuelve a generar créditos ni a reservar NFC otra vez. */
export function shouldSkipOrderFulfillment(orderStatus: string): boolean {
  return orderStatus === "paid";
}
