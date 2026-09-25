"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateAlbumMemories } from "@/lib/actions/albums";

export function MemoriesEditor({ albumId, initial }: { albumId: string; initial: string[] }) {
  const [entries, setEntries] = useState<string[]>(initial.length > 0 ? initial : [""]);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function updateEntry(index: number, value: string) {
    setEntries((prev) => prev.map((e, i) => (i === index ? value : e)));
    setMessage(null);
  }

  function addEntry() {
    setEntries((prev) => [...prev, ""]);
  }

  function removeEntry(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateAlbumMemories(albumId, entries);
      setMessage(result.error ?? "Momentos guardados.");
    });
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <div key={index} className="flex gap-2">
          <Textarea
            value={entry}
            onChange={(e) => updateEntry(index, e.target.value)}
            placeholder="Escribe un momento de este recuerdo…"
            className="min-h-[90px]"
          />
          {entries.length > 1 && (
            <button
              type="button"
              onClick={() => removeEntry(index)}
              aria-label="Quitar este momento"
              className="h-fit rounded-lg p-2 text-ink-300 hover:bg-ink-50 hover:text-danger focus-ring"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}

      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={addEntry}>
          <Plus className="h-4 w-4" /> Añadir otro momento
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar momentos
        </Button>
        {message && <span className="text-xs text-ink-500">{message}</span>}
      </div>
    </div>
  );
}
