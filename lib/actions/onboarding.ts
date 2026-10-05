"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const VALID_INTENTS = ["viaje", "momento_especial", "lugar", "familia", "recuerdos", "otro"] as const;
export type OnboardingIntent = (typeof VALID_INTENTS)[number];

export async function completeOnboarding(intent: OnboardingIntent, nfcToken?: string | null) {
  if (!VALID_INTENTS.includes(intent)) {
    // La opción es solo para personalización (spec #8): si llega algo
    // inesperado, no bloqueamos al usuario, simplemente no la guardamos.
    intent = "otro";
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  await supabase
    .from("profiles")
    .update({ onboarding_intent: intent, onboarding_completed: true })
    .eq("id", userData.user.id);

  redirect(nfcToken ? `/albumes/nuevo?nfc=${encodeURIComponent(nfcToken)}` : "/dashboard");
}
