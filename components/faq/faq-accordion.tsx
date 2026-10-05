"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function FaqAccordion({ entries }: { entries: { q: string; a: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => {
        const open = openIndex === index;
        return (
          <div key={entry.q} className="overflow-hidden rounded-2xl bg-white shadow-soft">
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : index)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left focus-ring"
            >
              <span className="font-display text-base font-semibold text-ink-900">{entry.q}</span>
              <ChevronDown
                className={`h-5 w-5 flex-shrink-0 text-ink-500 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
            {open && (
              <p className="border-t border-ink-100 px-6 pb-5 pt-4 text-sm text-ink-700">{entry.a}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
