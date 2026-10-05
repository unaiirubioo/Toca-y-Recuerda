"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { signIn, type ActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" loading={pending}>
      Iniciar sesión
    </Button>
  );
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const nfc = searchParams.get("nfc");
  const [state, formAction] = useFormState<ActionResult, FormData>(
    (_prev, formData) => signIn(formData),
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      {nfc && <input type="hidden" name="nfc" value={nfc} />}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Contraseña</Label>
          <Link href="/recuperar" className="text-sm text-ink-500 hover:text-ink-700">
            ¿La olvidaste?
          </Link>
        </div>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton />
      <p className="text-center text-sm text-ink-500">
        ¿Todavía no tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-ink-900 hover:underline">
          Crea una
        </Link>
      </p>
    </form>
  );
}
