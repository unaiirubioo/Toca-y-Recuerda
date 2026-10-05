"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-context";

export function CartBadge() {
  const { itemCount } = useCart();

  return (
    <Link
      href="/tienda/carrito"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-ink-900 px-5 py-3 text-white shadow-card hover:bg-ink-700 focus-ring"
    >
      <ShoppingBag className="h-5 w-5" />
      {itemCount > 0 && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold">
          {itemCount}
        </span>
      )}
    </Link>
  );
}
