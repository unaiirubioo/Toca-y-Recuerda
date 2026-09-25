"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { completeOnboarding, type OnboardingIntent } from "@/lib/actions/onboarding";

const OPTIONS: { value: OnboardingIntent; emoji: string; label: string }[] = [
  { value: "viaje", emoji: "✈️", label: "Viaje" },
  { value: "momento_especial", emoji: "❤️", label: "Momento especial" },
  { value: "lugar", emoji: "🏠", label: "Lugar" },
  { value: "familia", emoji: "👨‍👩‍👧", label: "Familia" },
  { value: "recuerdos", emoji: "📸", label: "Recuerdos" },
  { value: "otro", emoji: "✨", label: "Otro" },
];

export function OnboardingFlow({ userName, nfcToken }: { userName?: string | null; nfcToken?: string | null }) {
  const [step, setStep] = useState<"bienvenida" | "intencion">("bienvenida");
  const [pending, startTransition] = useTransition();

  if (step === "bienvenida") {
    return (
      <div className="text-center">
        <h1 className="mb-3 font-display text-3xl font-semibold text-ink-900">
          Bienvenido{userName ? `, ${userName}` : ""} a Toca y Recuerda
        </h1>
        <p className="mb-8 text-ink-500">Vamos a crear tu primer recuerdo.</p>
        <Button size="lg" onClick={() => setStep("intencion")}>
          Empezar
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h1 className="mb-8 font-display text-2xl font-semibold text-ink-900">
        ¿Qué quieres guardar?
      </h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => completeOnboarding(option.value, nfcToken))}
            className="flex flex-col items-center gap-2 rounded-2xl border border-ink-100 bg-white p-6 shadow-soft transition hover:border-amber-500 hover:shadow-card disabled:opacity-50 focus-ring"
          >
            <span className="text-3xl">{option.emoji}</span>
            <span className="text-sm font-medium text-ink-900">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
