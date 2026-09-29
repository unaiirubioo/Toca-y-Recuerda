"use client";

import { useState, useTransition } from "react";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { grantProductToUser } from "@/lib/actions/admin-grants";
import { formatEuros } from "@/lib/format";
import type { StoreProduct } from "@/lib/queries/products";

export function GrantProductForm({ userId, products }: { userId: string; products: StoreProduct[] }) {
  const [slug, setSlug] = useState(products[0]?.slug ?? "");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function grant() {
    if (!slug) return;
    setMessage(null);
    startTransition(async () => {
      const result = await grantProductToUser(userId, slug);
      if ("error" in result) {
        setOk(false);
        setMessage(result.error);
        return;
      }
      setOk(true);
      setMessage("Regalado correctamente. Ya tiene los créditos en su cuenta.");
    });
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-soft">
      <div className="mb-3 flex items-center gap-2">
        <Gift className="h-4 w-4 text-amber-600" />
        <h2 className="font-display text-base font-semibold text-ink-900">Regalar un pack</h2>
      </div>
      <p className="mb-4 text-sm text-ink-500">
        Da de alta cualquier producto del catálogo sin cobrarle — aparecerá en su historial como un pedido gratuito.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="min-w-[220px] rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm focus-ring"
        >
          {products.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name} · {formatEuros(p.priceCents)}
            </option>
          ))}
        </select>
        <Button type="button" onClick={grant} disabled={pending || !slug} size="sm">
          {pending ? "Regalando…" : "Regalar"}
        </Button>
      </div>
      {message && <p className={`mt-3 text-sm ${ok ? "text-success" : "text-danger"}`}>{message}</p>}
    </section>
  );
}
