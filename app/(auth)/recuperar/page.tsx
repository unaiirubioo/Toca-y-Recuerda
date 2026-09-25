import type { Metadata } from "next";
import { RequestPasswordResetForm } from "@/components/auth/request-password-reset-form";

export const metadata: Metadata = { title: "Recupera tu contraseña" };

export default function RequestPasswordResetPage() {
  return (
    <>
      <h1 className="mb-2 text-center font-display text-2xl font-semibold text-ink-900">
        ¿Olvidaste tu contraseña?
      </h1>
      <p className="mb-6 text-center text-sm text-ink-500">
        Escribe tu email y te enviaremos un enlace para crear una nueva.
      </p>
      <RequestPasswordResetForm />
    </>
  );
}
