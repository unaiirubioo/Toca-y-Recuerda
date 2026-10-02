"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitContactMessage } from "@/lib/actions/contact";

export function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await submitContactMessage(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSent(true);
      formRef.current?.reset();
    });
  }

  if (sent) {
    return (
      <div className="rounded-2xl bg-success/10 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-success" />
        <p className="font-medium text-ink-900">Mensaje enviado, ¡gracias!</p>
        <p className="mt-1 text-sm text-ink-500">Te responderemos lo antes posible.</p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Tu nombre</Label>
        <Input id="name" name="name" required />
      </div>
      <div>
        <Label htmlFor="email">Tu correo</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div>
        <Label htmlFor="message">Mensaje</Label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="w-full rounded-xl border border-ink-100 bg-white px-3.5 py-2.5 text-sm focus-ring"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        <Send className="h-4 w-4" />
        {pending ? "Enviando…" : "Enviar mensaje"}
      </Button>
    </form>
  );
}
