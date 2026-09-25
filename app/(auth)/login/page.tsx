import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Inicia sesión" };

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-6 text-center font-display text-2xl font-semibold text-ink-900">
        Bienvenido de nuevo
      </h1>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </>
  );
}
