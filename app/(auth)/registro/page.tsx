import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Crea tu cuenta" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="mb-6 text-center font-display text-2xl font-semibold text-ink-900">
        Crea tu cuenta
      </h1>
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </>
  );
}
