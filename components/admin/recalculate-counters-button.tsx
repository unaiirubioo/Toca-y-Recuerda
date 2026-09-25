"use client";

import { useState, useTransition } from "react";
import { RefreshCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recalculateAllCounters } from "@/lib/actions/admin-maintenance";

export function RecalculateCountersButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run() {
    setMessage(null);
    startTransition(async () => {
      const result = await recalculateAllCounters();
      setMessage("error" in result ? result.error : "Contadores recalculados.");
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="sm" onClick={run} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
        Recalcular contadores de álbumes
      </Button>
      {message && <span className="text-xs text-ink-500">{message}</span>}
    </div>
  );
}
