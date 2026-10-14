"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { createMemoryImage, type CreatedMemory, type CreateMemoryResult } from "./actions";

const BUTTON = "rounded-full border border-zinc-300 px-4 py-1.5 text-sm transition hover:border-black disabled:opacity-30 dark:border-zinc-700 dark:hover:border-white";
const PRIMARY = "rounded-full bg-black px-4 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";

// Shown one after another while the illustration is drawn (it takes ~45 s)
const DRAWING = [
  "Sharpening the pencils…",
  "Squinting at your photo…",
  "Picking a tiny color palette…",
  "Drawing everyone's best side…",
  "Making heads slightly bigger…",
  "Adding decorative squiggles…",
  "Resisting the urge to add shadows…",
  "Framing it like a designer poster…",
  "Almost done, signing the corner…",
];

type Props = {
  memoryId: number;
  // Hours until the user can create another memory (0 = now)
  wait: number;
  // This month's budget is used up
  paused: boolean;
};

export default function CreateMemoryButton({ memoryId, wait, paused }: Props) {
  const [memory, setMemory] = useState<CreatedMemory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [line, setLine] = useState(0);
  const [confirming, setConfirming] = useState(false);

  // Next funny line every 5 s while drawing; the last one stays
  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => setLine((i) => Math.min(i + 1, DRAWING.length - 1)), 5000);
    return () => clearInterval(timer);
  }, [loading]);

  function create() {
    setConfirming(false);
    setError(null);
    setLine(0);
    startLoading(async () => {
      let result: CreateMemoryResult;
      try {
        result = await createMemoryImage(memoryId);
      } catch {
        setError("Something went wrong. Check your connection and try again.");
        return;
      }
      if ("error" in result) setError(result.error);
      else setMemory(result.memory);
    });
  }

  if (memory) {
    return (
      <div className="flex basis-full flex-col items-center gap-3">
        {/* Private short-lived link, so it isn't run through the shared image optimizer */}
        <Image src={memory.view} alt="Your memory" width={1024} height={1024} unoptimized className="h-auto w-full rounded-xl" />
        <div className="flex gap-2">
          <a href={memory.download} className={BUTTON}>
            Download
          </a>
          <Link href="/memories" className={BUTTON}>
            See My memories
          </Link>
        </div>
      </div>
    );
  }

  // Ask first, right on the card: the photo leaves the app and it's 1 per day
  if (confirming) {
    return (
      <div className="flex basis-full flex-col gap-2 rounded-xl bg-zinc-100 p-3 text-sm dark:bg-zinc-900">
        <p>Your photo is sent to OpenAI to make the image. You can create 1 memory per day.</p>
        <div className="flex gap-2">
          <button onClick={create} className={PRIMARY}>
            Create
          </button>
          <button onClick={() => setConfirming(false)} className={BUTTON}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const disabled = loading || wait > 0 || paused;
  return (
    <div className="flex flex-col gap-1">
      <button onClick={() => setConfirming(true)} disabled={disabled} className={`${BUTTON} self-start`}>
        {loading ? "Drawing…" : paused ? "Memories paused this month" : wait > 0 ? `Next memory in ${wait} h` : "Create a memory"}
      </button>
      {loading && <p className="animate-pulse text-xs text-zinc-500">{DRAWING[line]}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
