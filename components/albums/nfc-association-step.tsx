"use client";

import { useEffect, useState, useTransition } from "react";
import { ScanLine, Sparkles, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listMyUnassignedNfcForWizard } from "@/lib/actions/nfc-wizard";
import { generateMySelfNfc } from "@/lib/actions/nfc-self";

type OwnedTag = { id: string; publicToken: string; selfGenerated: boolean };

export function NfcAssociationStep({ onResolved }: { onResolved: (token: string | null) => void }) {
  const [mode, setMode] = useState<"choose" | "pick-owned" | "type-code">("choose");
  const [owned, setOwned] = useState<OwnedTag[] | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    listMyUnassignedNfcForWizard().then(setOwned);
  }, []);

  function chooseHaveOne() {
    if (owned && owned.length > 0) {
      setMode("pick-owned");
    } else {
      setMode("type-code");
    }
  }

  function generateOwn() {
    setError(null);
    startTransition(async () => {
      const result = await generateMySelfNfc();
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if ("token" in result) onResolved(result.token);
    });
  }

  if (mode === "pick-owned" && owned) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-500">Elige cuál de tus NFC quieres asociar a este recuerdo.</p>
        <div className="space-y-2">
          {owned.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => onResolved(tag.publicToken)}
              className="flex w-full items-center justify-between rounded-xl border border-ink-100 px-4 py-3 text-left text-sm hover:border-amber-500 focus-ring"
            >
              <span className="font-mono text-xs text-ink-700">{tag.publicToken}</span>
              <span className="text-xs text-ink-500">{tag.selfGenerated ? "Autogenerado" : "Físico"}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setMode("choose")} className="text-xs text-ink-500 hover:underline">
          Atrás
        </button>
      </div>
    );
  }

  if (mode === "type-code") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-500">
          Lo ideal es que <strong>acerques ahora el móvil a tu NFC físico</strong>: se abrirá una página
          nueva que te llevará directamente a crear el álbum ya asociado a él. Si no puedes escanearlo
          ahora mismo (por ejemplo, estás en el ordenador), escribe aquí el código que viene en la etiqueta:
        </p>
        <Input
          placeholder="Código del NFC"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" onClick={() => (code.trim() ? onResolved(code.trim()) : setError("Escribe el código."))}>
            Continuar
          </Button>
          <Button type="button" variant="ghost" onClick={() => setMode("choose")}>
            Atrás
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-500">
        Puedes asociar un NFC ahora o hacerlo más tarde desde la edición del álbum — tú decides.
      </p>
      <button
        type="button"
        onClick={chooseHaveOne}
        className="flex w-full items-center gap-3 rounded-xl border border-ink-100 p-4 text-left hover:border-amber-500 focus-ring"
      >
        <ScanLine className="h-5 w-5 flex-shrink-0 text-amber-600" />
        <span>
          <span className="block text-sm font-medium text-ink-900">Ya tengo un NFC comprado</span>
          <span className="block text-xs text-ink-500">Te diremos cómo escanearlo para asociarlo.</span>
        </span>
      </button>
      <button
        type="button"
        onClick={generateOwn}
        disabled={pending}
        className="flex w-full items-center gap-3 rounded-xl border border-ink-100 p-4 text-left hover:border-amber-500 focus-ring disabled:opacity-50"
      >
        <Sparkles className="h-5 w-5 flex-shrink-0 text-amber-600" />
        <span>
          <span className="block text-sm font-medium text-ink-900">
            {pending ? "Generando…" : "Tengo mi propia etiqueta NFC en blanco"}
          </span>
          <span className="block text-xs text-ink-500">
            Te damos un código para que lo grabes tú mismo (por ejemplo con la app "NFC Tools").
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => onResolved(null)}
        className="flex w-full items-center gap-3 rounded-xl border border-dashed border-ink-100 p-4 text-left hover:border-ink-300 focus-ring"
      >
        <SkipForward className="h-5 w-5 flex-shrink-0 text-ink-500" />
        <span>
          <span className="block text-sm font-medium text-ink-900">Ahora no</span>
          <span className="block text-xs text-ink-500">Podrás asociarlo cuando quieras desde el álbum.</span>
        </span>
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
