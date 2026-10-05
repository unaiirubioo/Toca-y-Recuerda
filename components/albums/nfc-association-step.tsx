"use client";

import { useEffect, useState, useTransition } from "react";
import { ScanLine, Sparkles, SkipForward, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listMyUnassignedNfcForWizard } from "@/lib/actions/nfc-wizard";
import { generateMySelfNfc } from "@/lib/actions/nfc-self";

type OwnedTag = { id: string; publicToken: string; selfGenerated: boolean };
type GeneratedTag = { token: string; url: string };

export function NfcAssociationStep({ onResolved }: { onResolved: (token: string | null) => void }) {
  const [mode, setMode] = useState<"choose" | "pick-owned" | "type-code" | "generated">("choose");
  const [owned, setOwned] = useState<OwnedTag[] | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [generated, setGenerated] = useState<GeneratedTag | null>(null);
  const [copied, setCopied] = useState(false);

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
      if ("token" in result) {
        setGenerated({ token: result.token, url: result.url });
        setMode("generated");
      }
    });
  }

  function copyCode() {
    if (!generated) return;
    navigator.clipboard?.writeText(generated.token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (mode === "generated" && generated) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-500/10 p-4">
          <p className="mb-2 text-sm font-medium text-ink-900">¡Tu etiqueta NFC ya está creada!</p>
          <p className="mb-3 text-xs text-ink-500">
            Apunta este código — lo necesitarás para grabarlo en tu etiqueta física (por ejemplo con la
            app "NFC Tools"). También podrás verlo más adelante en Mi cuenta.
          </p>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-ink-100 bg-white px-3 py-2.5">
            <span className="break-all font-mono text-sm font-semibold text-ink-900">{generated.token}</span>
            <button
              type="button"
              onClick={copyCode}
              className="flex flex-shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-500/10"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
        <Button type="button" className="w-full" onClick={() => onResolved(generated.token)}>
          Continuar
        </Button>
      </div>
    );
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
      <div className="space-y-4">
        <div className="rounded-xl bg-amber-500/10 p-4">
          <p className="mb-3 text-sm font-medium text-ink-900">Así se asocia en 3 pasos:</p>
          <ol className="space-y-2.5 text-sm text-ink-700">
            <li className="flex gap-2.5">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-white">
                1
              </span>
              Desbloquea el móvil y activa el NFC si lo tiene desactivado (Ajustes → Conexión → NFC, en
              la mayoría de Android; en iPhone 7 o más reciente ya viene activado).
            </li>
            <li className="flex gap-2.5">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-white">
                2
              </span>
              Acerca la parte trasera del móvil a la etiqueta NFC y espera un segundo sin moverlo — no
              hace falta abrir ninguna app, el teléfono lo detecta solo.
            </li>
            <li className="flex gap-2.5">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-white">
                3
              </span>
              Se abrirá sola una página en el navegador. Si te pide crear cuenta, hazlo — al terminar
              volverás aquí mismo, con el álbum ya asociado a ese NFC.
            </li>
          </ol>
        </div>

        <details className="text-sm text-ink-500">
          <summary className="cursor-pointer select-none font-medium text-ink-700">
            No puedo escanearlo ahora (estoy en el ordenador)
          </summary>
          <div className="mt-3 space-y-3">
            <p>Escribe el código que viene impreso o grabado en la etiqueta:</p>
            <Input placeholder="Código del NFC" value={code} onChange={(e) => setCode(e.target.value)} />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button
              type="button"
              size="sm"
              onClick={() => (code.trim() ? onResolved(code.trim()) : setError("Escribe el código."))}
            >
              Continuar con ese código
            </Button>
          </div>
        </details>

        <Button type="button" variant="ghost" onClick={() => setMode("choose")}>
          Atrás
        </Button>
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
