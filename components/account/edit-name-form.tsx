"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateMyName } from "@/lib/actions/auth";

export function EditNameForm({ initialName }: { initialName: string }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("fullName", name);
      const result = await updateMyName(formData);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 focus-ring"
      >
        <Pencil className="h-3.5 w-3.5" /> Editar nombre
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <div>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
