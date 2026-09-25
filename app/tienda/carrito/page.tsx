"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatEuros } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export default function CartPage() {
  const { items, setQuantity, removeItem, totalCents } = useCart();

  if (items.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream-100 px-4">
        <EmptyState
          emoji="🛒"
          title="Tu carrito está vacío"
          description="Explora la tienda para desbloquear más álbumes o pedir tu NFC."
          action={
            <Link href="/tienda" className={buttonVariants()}>
              Ir a la tienda
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream-100 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 flex items-center gap-2 font-display text-2xl font-semibold text-ink-900">
          <ShoppingBag className="h-6 w-6" /> Tu carrito
        </h1>

        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-soft"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink-900">{item.name}</p>
                {item.shippingIncluded && <p className="text-xs text-success">Envío incluido</p>}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity(item.productId, item.quantity - 1)}
                  className="rounded-lg border border-ink-100 p-1.5 hover:bg-ink-50 focus-ring"
                  aria-label="Quitar una unidad"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center text-sm">{item.quantity}</span>
                <button
                  onClick={() => setQuantity(item.productId, item.quantity + 1)}
                  className="rounded-lg border border-ink-100 p-1.5 hover:bg-ink-50 focus-ring"
                  aria-label="Añadir una unidad"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <p className="w-20 flex-shrink-0 text-right font-medium text-ink-900">
                {formatEuros(item.priceCents * item.quantity)}
              </p>

              <button
                onClick={() => removeItem(item.productId)}
                className="flex-shrink-0 rounded-lg p-1.5 text-ink-300 hover:bg-ink-50 hover:text-danger focus-ring"
                aria-label="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-2 rounded-2xl bg-white p-5 shadow-soft">
          <div className="flex justify-between text-sm text-ink-500">
            <span>Envío</span>
            <span>Incluido donde aplica</span>
          </div>
          <div className="flex justify-between border-t border-ink-100 pt-2 font-display text-lg font-semibold text-ink-900">
            <span>Total</span>
            <span>{formatEuros(totalCents)}</span>
          </div>
        </div>

        <Link href="/checkout" className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full")}>
          Continuar al pago
        </Link>
        <Link href="/tienda" className="mt-3 block text-center text-sm text-ink-500 hover:underline">
          Seguir comprando
        </Link>
      </div>
    </main>
  );
}
