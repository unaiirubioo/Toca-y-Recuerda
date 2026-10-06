"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, ImagePlus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitContactMessage } from "@/lib/actions/contact";
import { CONTACT_CATEGORIES } from "@/lib/contact-constants";

export function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoPreview(null);
      return;
    }
    setPhotoPreview(URL.createObjectURL(file));
  }

  function clearPhoto() {
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await submitContactMessage(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSent(true);
      setPhotoPreview(null);
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
        <Label htmlFor="category">Motivo</Label>
        <select
          id="category"
          name="category"
          required
          defaultValue=""
          className="w-full rounded-xl border border-ink-100 bg-white px-3.5 py-2.5 text-sm focus-ring"
        >
          <option value="" disabled>
            Elige una opción…
          </option>
          {CONTACT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="title">Título</Label>
        <Input id="title" name="title" placeholder="Resume tu mensaje en pocas palabras" required />
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

      <div>
        <Label htmlFor="photo">Foto (opcional)</Label>
        {photoPreview ? (
          <div className="relative mt-1 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreview} alt="Foto adjunta" className="h-28 w-28 rounded-xl object-cover" />
            <button
              type="button"
              onClick={clearPhoto}
              className="absolute -right-2 -top-2 rounded-full bg-ink-900 p-1 text-white"
              aria-label="Quitar foto"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-1 flex items-center gap-2 rounded-xl border border-dashed border-ink-200 px-3.5 py-2.5 text-sm text-ink-500 hover:border-amber-500 hover:text-amber-600 focus-ring"
          >
            <ImagePlus className="h-4 w-4" />
            Adjuntar una foto
          </button>
        )}
        <input
          ref={fileInputRef}
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
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
