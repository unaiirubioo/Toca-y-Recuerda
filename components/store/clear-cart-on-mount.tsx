"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-context";

/** Vacía el carrito una sola vez, al confirmarse la compra. */
export function ClearCartOnMount() {
  const { clear } = useCart();
  useEffect(() => {
    clear();
    // Solo al montar: no depende de `clear` en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
