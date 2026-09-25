import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = { title: "Bienvenido" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ nfc?: string }>;
}) {
  const { nfc } = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, onboarding_completed")
    .eq("id", userData.user.id)
    .single();

  if ((profile as any)?.onboarding_completed) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-100 px-4">
      <OnboardingFlow userName={(profile as any)?.full_name} nfcToken={nfc} />
    </main>
  );
}
