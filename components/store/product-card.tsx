"use client";

import { Camera, Film, HardDrive, Nfc, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/cart-context";
import { formatEuros, formatMb } from "@/lib/format";
import type { StoreProduct } from "@/lib/queries/products";

export function ProductCard({ product, isBestValue }: { product: StoreProduct; isBestValue?: boolean }) {
  const { addItem, items } = useCart();
  const inCart = items.find((i) => i.productId === product.id);

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-white p-6 shadow-soft ${
        isBestValue ? "border-amber-500 ring-1 ring-amber-500/30" : "border-ink-100"
      }`}
    >
      {isBestValue && (
        <Badge variant="premium" className="mb-3 w-fit">
          Mejor precio
        </Badge>
      )}

      <h3 className="font-display text-lg font-semibold text-ink-900">{product.name}</h3>
      {product.description && <p className="mt-1 text-sm text-ink-500">{product.description}</p>}

      <p className="mt-4 font-display text-2xl font-semibold text-ink-900">
        {formatEuros(product.priceCents)}
        {product.unitPriceCents && (
          <span className="ml-2 text-sm font-normal text-ink-500">
            ({formatEuros(product.unitPriceCents)}/unidad)
          </span>
        )}
      </p>
      <p className="text-xs text-ink-500">Pago único</p>

      <ul className="mt-4 flex-1 space-y-2 text-sm text-ink-700">
        {product.albumCredits > 0 && (
          <li className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-ink-300" />
            {product.albumCredits} álbum{product.albumCredits !== 1 && "es"} Premium
          </li>
        )}
        {product.nfcCredits > 0 && (
          <li className="flex items-center gap-2">
            <Nfc className="h-4 w-4 text-ink-300" />
            {product.nfcCredits} NFC físico{product.nfcCredits !== 1 && "s"}
          </li>
        )}
        {product.photoLimit && (
          <li className="flex items-center gap-2">
            <Film className="h-4 w-4 text-ink-300" />
            Hasta {product.photoLimit} fotos y {product.videoLimit} vídeos por álbum
          </li>
        )}
        {product.storageLimitMb && (
          <li className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-ink-300" />
            {formatMb(product.storageLimitMb)} por álbum
          </li>
        )}
        {product.nfcCredits > 0 && (
          <li className="flex items-center gap-2 text-success">
            <Truck className="h-4 w-4" /> Envío incluido
          </li>
        )}
      </ul>

      <Button
        className="mt-5 w-full"
        variant={inCart ? "outline" : "primary"}
        onClick={() =>
          addItem({
            productId: product.id,
            slug: product.slug,
            name: product.name,
            priceCents: product.priceCents,
            shippingIncluded: product.shippingIncluded,
          })
        }
      >
        {inCart ? `En el carrito (${inCart.quantity})` : "Añadir al carrito"}
      </Button>
    </div>
  );
}
