"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/admin/copy-button";
import { generateNfcTag, generateNfcBatch } from "@/lib/actions/admin-nfc";

export function GenerateNfcPanel() {
  const [quantity, setQuantity] = useState(1);
  const [pending, startTransition] = useTransition();
  const [lastCreated, setLastCreated] = useState<{ token: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);
    setLastCreated(null);
    startTransition(async () => {
      if (quantity <= 1) {
        const result = await generateNfcTag();
        if ("error" in result) setError(result.error);
        else setLastCreated(result);
      } else {
        const result = await generateNfcBatch(quantity);
        if ("error" in result) setError(result.error);
      }
    });
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-soft">
      <h2 className="mb-4 font-display text-base font-semibold text-ink-900">Generar NFC</h2>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700">Cantidad</label>
          <Input
            type="number"
            min={1}
            max={100}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-24"
          />
        </div>
        <Button onClick={handleGenerate} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Generar
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {lastCreated && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <div>
            <p className="text-xs text-ink-500">Nuevo NFC listo para programar:</p>
            <p className="font-mono text-sm text-ink-900">{lastCreated.url}</p>
          </div>
          <CopyButton value={lastCreated.url} />
        </div>
      )}

      <p className="mt-3 text-xs text-ink-500">
        Copia esta URL y grábala físicamente en el NFC con una herramienta
        como NFC Tools (spec #61/#62). La plataforma nunca programa el
        chip: solo genera la URL.
      </p>

      <div className="mt-3 rounded-xl border border-ink-100 bg-cream-100 p-3 text-xs text-ink-500">
        <strong className="text-ink-700">📱 Si programas el NFC desde un iPhone</strong> y NFC
        Tools no te deja escribir la URL (algunos modelos y versiones de
        iOS limitan la escritura NDEF desde apps de terceros): prueba a
        actualizar iOS y la app a la última versión, o programa ese NFC
        desde un Android — la lectura por parte de tus clientes funciona
        igual de bien en ambos, esto solo afecta al paso de programarlo
        tú.
      </div>
    </div>
  );
}
