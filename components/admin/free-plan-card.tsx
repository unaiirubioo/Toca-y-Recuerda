"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateFreePlanSettings } from "@/lib/actions/admin-maintenance";
import type { FreePlanLimits } from "@/lib/plans";

export function FreePlanCard({ initial }: { initial: FreePlanLimits }) {
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateFreePlanSettings(form);
      setMessage("error" in result ? result.error : "Guardado.");
    });
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-soft">
      <h2 className="mb-1 font-display text-base font-semibold text-ink-900">Plan gratuito</h2>
      <p className="mb-4 text-sm text-ink-500">
        A diferencia de Premium y los packs (arriba), este plan no es un
        producto comprable — es el estado por defecto de todo álbum
        nuevo. Antes solo se podía cambiar tocando código; ahora se
        edita aquí, como todo lo demás.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field
          label="Álbumes máx."
          value={form.maxAlbums}
          onChange={(v) => setForm((f) => ({ ...f, maxAlbums: v }))}
        />
        <Field
          label="Fotos por álbum"
          value={form.photoLimit}
          onChange={(v) => setForm((f) => ({ ...f, photoLimit: v }))}
        />
        <Field
          label="Vídeos por álbum"
          value={form.videoLimit}
          onChange={(v) => setForm((f) => ({ ...f, videoLimit: v }))}
        />
        <Field
          label="Almacén (MB)"
          value={form.storageLimitMb}
          onChange={(v) => setForm((f) => ({ ...f, storageLimitMb: v }))}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
        </Button>
        {message && <span className="text-xs text-ink-500">{message}</span>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-ink-500">{label}</label>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-9 text-sm" />
    </div>
  );
}
