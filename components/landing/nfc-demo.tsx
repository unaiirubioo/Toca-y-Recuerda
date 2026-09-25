"use client";

import { useState } from "react";
import { Nfc } from "lucide-react";

const DEMO_PHOTOS = ["🏖️", "🌅", "🍽️", "🚗", "⛰️", "🎉"];

export function NfcDemo() {
  const [revealed, setRevealed] = useState(false);

  return (
    <section className="px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">Pruébalo tú mismo</h2>
        <p className="mt-2 text-ink-500">
          En el móvil, esto pasa acercándolo al NFC. Aquí, pulsa para verlo.
        </p>

        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          className="group mx-auto mt-8 flex flex-col items-center gap-3 focus-ring"
        >
          <span
            className={`flex h-24 w-24 items-center justify-center rounded-full border-2 transition-all ${
              revealed
                ? "scale-110 border-amber-500 bg-amber-500/10"
                : "border-dashed border-ink-300 group-hover:border-ink-500"
            }`}
          >
            <Nfc className={`h-10 w-10 transition-colors ${revealed ? "text-amber-600" : "text-ink-500"}`} />
          </span>
          <span className="text-sm font-medium text-ink-700">
            {revealed ? "¡Ahí está tu recuerdo!" : "Acerca tu móvil"}
          </span>
        </button>

        <div
          className={`mx-auto mt-8 max-w-md overflow-hidden rounded-2xl bg-white shadow-card transition-all duration-500 ${
            revealed ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="bg-gradient-to-br from-ink-700 to-ink-900 px-6 py-8 text-white">
            <p className="font-display text-lg font-semibold">Nuestro viaje a Lisboa</p>
            <p className="text-sm text-white/70">12 de mayo de 2025 · Lisboa, Portugal</p>
          </div>
          <div className="grid grid-cols-3 gap-1 p-3">
            {DEMO_PHOTOS.map((emoji, i) => (
              <div
                key={i}
                className="flex aspect-square items-center justify-center rounded-lg bg-cream-100 text-2xl"
              >
                {emoji}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
