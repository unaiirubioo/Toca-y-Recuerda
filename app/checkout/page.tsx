"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatEuros } from "@/lib/format";
import { createCheckoutSession } from "@/lib/actions/checkout";
import { Button } from "@/components/ui/button";

export default function CheckoutPage() {
  const { items, totalCents } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setError(null);
    setLoading(true);
    const result = await createCheckoutSession(items.map((i) => ({ productId: i.productId, quantity: i.quantity })));
    if ("error" in result) {
      setError(result.error);
      setLoading(false);
      return;
    }
    window.location.href = result.url;
  }

  if (items.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream-100 px-4 text-center">
        <div>
          <p className="mb-4 text-ink-500">Tu carrito está vacío.</p>
          <Link href="/tienda" className="font-medium text-amber-600 hover:underline">
            Ir a la tienda
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-card">
        <h1 className="mb-6 font-display text-xl font-semibold text-ink-900">Resumen del pedido</h1>

        <div className="space-y-2 rounded-xl bg-cream-100 p-4 text-sm">
          {items.map((item) => (
            <div key={item.productId} className="flex justify-between">
              <span>
                {item.quantity}× {item.name}
              </span>
              <span>{formatEuros(item.priceCents * item.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-ink-100 pt-2 font-semibold">
            <span>Total</span>
            <span>{formatEuros(totalCents)}</span>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <Button className="mt-6 w-full" size="lg" onClick={handlePay} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Pagar con Stripe
        </Button>
        <p className="mt-2 text-center text-xs text-ink-500">
          Tarjeta, Bizum, Apple Pay o Google Pay — sin guardar tus datos de pago en nuestros servidores.
        </p>

        <Link href="/tienda/carrito" className="mt-4 block text-center text-sm text-ink-500 hover:underline">
          Volver al carrito
        </Link>
      </div>
    </main>
  );
}
