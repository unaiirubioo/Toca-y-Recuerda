import type { Metadata } from "next";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function UpdatePasswordPage() {
  return (
    <>
      <h1 className="mb-6 text-center font-display text-2xl font-semibold text-ink-900">
        Crea tu nueva contraseña
      </h1>
      <UpdatePasswordForm />
    </>
  );
}
