"use client";

import { useState, useTransition } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { unlockAlbumBySlug, unlockAlbumByToken } from "@/lib/actions/public-album";

export function PasswordGate({
  mode,
  identifier,
}: {
  mode: "slug" | "token";
  identifier: string;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result =
        mode === "slug" ? await unlockAlbumBySlug(identifier, password) : await unlockAlbumByToken(identifier, password);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
          <Lock className="h-5 w-5 text-ink-700" />
        </div>
        <h1 className="mb-2 font-display text-xl font-semibold text-ink-900">
          Este recuerdo es privado
        </h1>
        <p className="mb-6 text-sm text-ink-500">
          Introduce la contraseña para verlo.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-3"
        >
          <Input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" loading={pending}>
            Entrar
          </Button>
        </form>
      </div>
    </main>
  );
}
