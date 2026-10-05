"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link as LinkIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { linkNfcByToken } from "@/lib/actions/albums";

export function NfcLinkByCodeForm({ albumId }: { albumId: string }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await linkNfcByToken(albumId, token);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      setToken("");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-2 sm:flex-row sm:items-start"
    >
      <div className="flex-1">
        <Input
          placeholder="Código del NFC (ej. 7XkP92mQaL4)"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
      <Button type="submit" size="sm" disabled={pending || !token.trim()}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
        Vincular
      </Button>
    </form>
  );
}
