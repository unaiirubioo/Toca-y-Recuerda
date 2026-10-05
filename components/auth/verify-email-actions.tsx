"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkEmailVerifiedAndSignIn, resendVerificationEmail } from "@/lib/actions/auth";

export function VerifyEmailActions() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resending, startResend] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  function checkNow() {
    setMessage(null);
    startTransition(async () => {
      const result = await checkEmailVerifiedAndSignIn();
      if (result.status === "verified") {
        const url = result.nfc ? `/correo-verificado?nfc=${encodeURIComponent(result.nfc)}` : "/correo-verificado";
        router.push(url);
        return;
      }
      if (result.status === "not-verified") {
        setMessage("Todavía no hemos recibido la confirmación. Revisa tu bandeja de entrada (y el spam) y vuelve a intentarlo.");
        return;
      }
      setMessage(result.error);
    });
  }

  function resend() {
    setResendMessage(null);
    startResend(async () => {
      const result = await resendVerificationEmail();
      setResendMessage(result?.error ?? "Te hemos enviado el correo otra vez.");
    });
  }

  return (
    <div className="mt-6 space-y-3">
      <Button onClick={checkNow} disabled={pending} className="w-full">
        <MailCheck className="h-4 w-4" />
        {pending ? "Comprobando…" : "Ya he verificado mi correo"}
      </Button>
      {message && <p className="text-sm text-ink-500">{message}</p>}

      <Button onClick={resend} disabled={resending} variant="ghost" className="w-full">
        <RefreshCw className="h-4 w-4" />
        {resending ? "Enviando…" : "Reenviar correo de verificación"}
      </Button>
      {resendMessage && <p className="text-sm text-ink-500">{resendMessage}</p>}
    </div>
  );
}
