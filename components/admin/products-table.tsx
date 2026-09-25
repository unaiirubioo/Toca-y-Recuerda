"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateProduct } from "@/lib/actions/admin-products";

export type EditableProduct = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  albumCredits: number;
  nfcCredits: number;
  photoLimit: number | null;
  videoLimit: number | null;
  storageLimitMb: number | null;
  active: boolean;
};

export function ProductsTable({ products }: { products: EditableProduct[] }) {
  return (
    <div className="space-y-3">
      {products.map((p) => (
        <ProductRow key={p.id} product={p} />
      ))}
    </div>
  );
}

function ProductRow({ product }: { product: EditableProduct }) {
  const [form, setForm] = useState(product);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function save() {
    setSaved(false);
    startTransition(async () => {
      const result = await updateProduct(product.id, {
        priceCents: form.priceCents,
        albumCredits: form.albumCredits,
        nfcCredits: form.nfcCredits,
        photoLimit: form.photoLimit,
        videoLimit: form.videoLimit,
        storageLimitMb: form.storageLimitMb,
        active: form.active,
      });
      if ("ok" in result) {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-medium text-ink-900">{product.name}</p>
          <p className="font-mono text-xs text-ink-500">{product.slug}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
          />
          Activo
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        <Field label="Precio (céntimos)" value={form.priceCents} onChange={(v) => setForm((f) => ({ ...f, priceCents: v }))} />
        <Field label="Créditos álbum" value={form.albumCredits} onChange={(v) => setForm((f) => ({ ...f, albumCredits: v }))} />
        <Field label="Créditos NFC" value={form.nfcCredits} onChange={(v) => setForm((f) => ({ ...f, nfcCredits: v }))} />
        <Field label="Límite fotos" value={form.photoLimit ?? 0} onChange={(v) => setForm((f) => ({ ...f, photoLimit: v }))} />
        <Field label="Límite vídeos" value={form.videoLimit ?? 0} onChange={(v) => setForm((f) => ({ ...f, videoLimit: v }))} />
        <Field
          label="Almacén (MB)"
          value={form.storageLimitMb ?? 0}
          onChange={(v) => setForm((f) => ({ ...f, storageLimitMb: v }))}
        />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
        </Button>
        {saved && <span className="text-xs text-success">Guardado.</span>}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-ink-500">{label}</label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 text-sm"
      />
    </div>
  );
}
