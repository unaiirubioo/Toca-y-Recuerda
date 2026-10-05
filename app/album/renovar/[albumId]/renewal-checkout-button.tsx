"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createRenewalCheckoutSession } from "@/lib/actions/renewal-checkout";

export function RenewalCheckoutButton({ albumId }: { albumId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setError(null);
    setLoading(true);
    try {
      const result = await createRenewalCheckoutSession(albumId);
      if ("error" in result) {
        setError(result.error);
        setLoading(false);
        return;
      }
      window.location.href = result.url;
    } catch {
      setError("Algo ha fallado al conectar con el pago. Inténtalo otra vez.");
      setLoading(false);
    }
  }

  return (
    <div>
      <Button onClick={handlePay} disabled={loading} size="lg" className="w-full">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />} {loading ? "Conectando con el pago…" : "Pagar renovación"}
      </Button>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}
