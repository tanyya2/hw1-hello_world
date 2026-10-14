"use client";

import { useState, useTransition } from "react";
import { deleteMemoryImage } from "./actions";

const BUTTON = "rounded-full border border-zinc-300 px-4 py-1.5 text-sm transition hover:border-black dark:border-zinc-700 dark:hover:border-white";

export default function DeleteButton({ id }: { id: number }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startDelete] = useTransition();

  function onClick() {
    if (!confirm("Delete this memory? This can't be undone.")) return;
    startDelete(async () => {
      try {
        const result = await deleteMemoryImage(id);
        setError(result?.error ?? null);
      } catch {
        setError("Something went wrong. Check your connection and try again.");
      }
    });
  }

  return (
    <>
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button onClick={onClick} disabled={pending} className={`${BUTTON} disabled:opacity-30`}>
        {pending ? "Deleting…" : "Delete"}
      </button>
    </>
  );
}
