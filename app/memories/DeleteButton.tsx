"use client";

import { useState, useTransition } from "react";
import { deleteMemoryImage } from "./actions";

const BUTTON = "rounded-full border border-zinc-300 px-4 py-1.5 text-sm transition hover:border-black dark:border-zinc-700 dark:hover:border-white";
const DANGER = "rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-red-700";

export default function DeleteButton({ id }: { id: number }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startDelete] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function remove() {
    setConfirming(false);
    startDelete(async () => {
      try {
        const result = await deleteMemoryImage(id);
        setError(result?.error ?? null);
      } catch {
        setError("Something went wrong. Check your connection and try again.");
      }
    });
  }

  // Ask first, right on the card
  if (confirming) {
    return (
      <>
        <span className="text-sm">Delete this memory? This can&apos;t be undone.</span>
        <button onClick={remove} className={DANGER}>
          Delete
        </button>
        <button onClick={() => setConfirming(false)} className={BUTTON}>
          Cancel
        </button>
      </>
    );
  }

  return (
    <>
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button onClick={() => setConfirming(true)} disabled={pending} className={`${BUTTON} disabled:opacity-30`}>
        {pending ? "Deleting…" : "Delete"}
      </button>
    </>
  );
}
