import { Album, Gift, Sparkles } from "lucide-react";
import type { AlbumAvailabilityStatus } from "@/lib/business/album-eligibility";

export function AlbumAvailabilityBadge({ status }: { status: AlbumAvailabilityStatus }) {
  const { totalAvailable, freeRemaining, paidCreditsAvailable } = status;

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl p-4 ${
        totalAvailable > 0 ? "bg-success/10" : "bg-ink-100/60"
      }`}
    >
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
          totalAvailable > 0 ? "bg-success text-white" : "bg-ink-300 text-white"
        }`}
      >
        {totalAvailable > 0 ? <Sparkles className="h-5 w-5" /> : <Album className="h-5 w-5" />}
      </div>
      <div>
        <p className="font-display text-base font-semibold text-ink-900">
          {totalAvailable > 0
            ? `Tienes ${totalAvailable} álbum${totalAvailable === 1 ? "" : "es"} disponible${totalAvailable === 1 ? "" : "s"} para crear`
            : "No te queda ningún álbum disponible"}
        </p>
        <p className="text-xs text-ink-500">
          {freeRemaining > 0 && (
            <span className="inline-flex items-center gap-1">
              <Gift className="h-3 w-3" /> {freeRemaining} gratis
            </span>
          )}
          {freeRemaining > 0 && paidCreditsAvailable > 0 && " · "}
          {paidCreditsAvailable > 0 && `${paidCreditsAvailable} de tus packs comprados`}
          {freeRemaining === 0 && paidCreditsAvailable === 0 && "Ya has usado tu álbum gratis y no tienes créditos extra."}
        </p>
      </div>
    </div>
  );
}
