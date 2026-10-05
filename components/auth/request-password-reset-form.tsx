"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { requestPasswordReset, type ActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" loading={pending}>
      Enviar enlace de recuperación
    </Button>
  );
}

export function RequestPasswordResetForm() {
  const [state, formAction] = useFormState<ActionResult, FormData>(
    (_prev, formData) => requestPasswordReset(formData),
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton />
      <p className="text-center text-sm text-ink-500">
        <Link href="/login" className="font-medium text-ink-900 hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}
