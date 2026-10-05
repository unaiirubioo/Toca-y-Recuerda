import { describe, it, expect } from "vitest";
import { shouldSkipWebhookEvent, shouldSkipOrderFulfillment } from "@/lib/business/order-idempotency";

describe("shouldSkipWebhookEvent", () => {
  it("un evento ya registrado nunca se reprocesa", () => {
    expect(shouldSkipWebhookEvent(true)).toBe(true);
  });

  it("un evento nuevo sí se procesa", () => {
    expect(shouldSkipWebhookEvent(false)).toBe(false);
  });
});

describe("shouldSkipOrderFulfillment", () => {
  it("un pedido ya pagado nunca vuelve a generar créditos", () => {
    expect(shouldSkipOrderFulfillment("paid")).toBe(true);
  });

  it("un pedido pendiente sí debe procesarse cuando llegue el webhook", () => {
    expect(shouldSkipOrderFulfillment("pending")).toBe(false);
  });

  it("un pedido fallido o reembolsado no se trata como ya cumplido", () => {
    expect(shouldSkipOrderFulfillment("failed")).toBe(false);
    expect(shouldSkipOrderFulfillment("refunded")).toBe(false);
  });
});
