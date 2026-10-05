"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { signUp, type ActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" loading={pending}>
      Crear mi cuenta
    </Button>
  );
}

export function RegisterForm() {
  const searchParams = useSearchParams();
  const nfc = searchParams.get("nfc");
  const [state, formAction] = useFormState<ActionResult, FormData>(
    (_prev, formData) => signUp(formData),
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      {nfc && <input type="hidden" name="nfc" value={nfc} />}
      <div>
        <Label htmlFor="fullName">Tu nombre</Label>
        <Input id="fullName" name="fullName" type="text" autoComplete="name" required />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton />
      <p className="text-center text-sm text-ink-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-ink-900 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
