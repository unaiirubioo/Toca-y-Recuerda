"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { revokeGiftFromUser } from "@/lib/actions/admin-grants";

export function RevokeGiftButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function revoke() {
    if (!confirm("¿Quitar este regalo? Se retirará lo que el usuario no haya usado todavía.")) return;
    setMessage(null);
    startTransition(async () => {
      const result = await revokeGiftFromUser(orderId);
      if ("error" in result) {
        setMessage(result.error);
        return;
      }
      const parts: string[] = [];
      if (result.albumCreditsRemoved > 0) parts.push(`${result.albumCreditsRemoved} álbum(es) retirados`);
      if (result.nfcReleased > 0) parts.push(`${result.nfcReleased} NFC devueltos al stock`);
      if (result.nfcKept > 0) parts.push(`${result.nfcKept} NFC ya en uso (no se tocan)`);
      setMessage(parts.length > 0 ? parts.join(" · ") : "Ya estaba todo usado, no había nada que retirar.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={revoke}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-danger hover:bg-danger/10 focus-ring disabled:opacity-50"
      >
        <Undo2 className="h-3.5 w-3.5" />
        {pending ? "Quitando…" : "Quitar"}
      </button>
      {message && <p className="max-w-[220px] text-right text-xs text-ink-500">{message}</p>}
    </div>
  );
}
