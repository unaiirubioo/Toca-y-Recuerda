"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Nfc, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { CopyButton } from "@/components/admin/copy-button";
import { generateMySelfNfc } from "@/lib/actions/nfc-self";
import type { SelfNfcRow } from "@/lib/queries/self-nfc";
import { cn } from "@/lib/utils";

export function MyNfcPanel({
  initialTags,
  quota,
  bare,
}: {
  initialTags: SelfNfcRow[];
  quota: number;
  /** El contenedor y el título ya los pone quien use este componente (p.ej. /cuenta). */
  bare?: boolean;
}) {
  const [tags, setTags] = useState(initialTags);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canGenerate = tags.length < quota;

  function generate() {
    setError(null);
    startTransition(async () => {
      const result = await generateMySelfNfc();
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if ("token" in result) {
        setTags((prev) => [{ id: result.token, publicToken: result.token, url: result.url, albumId: null, createdAt: new Date().toISOString() }, ...prev]);
      }
    });
  }

  const content = (
    <>
      <p className="text-sm text-ink-500">
        ¿Ya tienes tu propia pegatina o etiqueta NFC? Genera aquí el código de Toca y Recuerda y
        grábalo tú mismo (por ejemplo, con la app gratuita "NFC Tools"). Tienes derecho a{" "}
        <strong className="text-ink-700">{quota}</strong> {quota === 1 ? "NFC propio" : "NFC propios"} —
        1 siempre gratis, y 1 más por cada álbum que compres sin NFC físico incluido.
      </p>

      {tags.length > 0 && (
        <ul className="mt-4 space-y-2">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-100 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="font-mono text-xs text-ink-700">{tag.publicToken}</p>
                <p className="truncate text-xs text-ink-500">{tag.url}</p>
              </div>
              <div className="flex items-center gap-2">
                <CopyButton value={tag.url} />
                {tag.albumId ? (
                  <span className="text-xs text-success">Vinculado a un álbum</span>
                ) : (
                  <Link href="/albumes/nuevo" className="text-xs font-medium text-amber-600 hover:underline">
                    Asociar a un álbum
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-4">
        {canGenerate ? (
          <Button onClick={generate} disabled={pending} variant="outline" size="sm">
            <Sparkles className="h-4 w-4" />
            {pending ? "Generando…" : "Generar mi NFC"}
          </Button>
        ) : (
          <Link href="/tienda" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Comprar un álbum o un NFC físico
          </Link>
        )}
      </div>
    </>
  );

  if (bare) return content;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-soft">
      <div className="mb-3 flex items-center gap-2">
        <Nfc className="h-4 w-4 text-amber-600" />
        <h2 className="font-display text-base font-semibold text-ink-900">Tu propio NFC</h2>
      </div>
      {content}
    </section>
  );
}
