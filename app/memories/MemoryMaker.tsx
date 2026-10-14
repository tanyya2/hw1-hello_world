"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { clearUnfinished, makeMemory, type Memory, type MemoryResult } from "./actions";
import MemoryCard from "./MemoryCard";
import { COOLDOWN_MS, MAX_PHOTO_BYTES, PHOTO_TYPES } from "./prompt";

const OFFLINE = "Something went wrong. Check your connection and try again.";

// Shown one after another while the caption is being written (it takes ~10–15 s)
const THINKING = [
  "Looking at your photo very seriously…",
  "Noticing the weird details…",
  "Writing 5 captions…",
  "Laughing at its own jokes…",
  "Throwing out the cringe ones…",
  "Picking the funniest…",
  "Almost there, adding the final touch…",
];

type Props = {
  userId: string;
  planId: number;
  // Minutes until the user can add another photo (0 = now)
  wait: number;
};

export default function MemoryMaker({ userId, planId, wait: initialWait }: Props) {
  const [memory, setMemory] = useState<Memory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(initialWait);
  const [loading, startLoading] = useTransition();
  const [line, setLine] = useState(0);

  // Next funny line every 2.5 s while loading; the last one stays
  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => setLine((i) => Math.min(i + 1, THINKING.length - 1)), 2500);
    return () => clearInterval(timer);
  }, [loading]);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const ext = PHOTO_TYPES[file.type];
    if (!ext || file.size > MAX_PHOTO_BYTES) {
      setError("Photos must be JPG, PNG or WebP, up to 5 MB.");
      return;
    }

    setError(null);
    setLine(0);
    startLoading(async () => {
      let result: MemoryResult;
      try {
        // Photos left by a failed attempt would block this upload
        await clearUnfinished();

        // The photo goes to Storage first; the server reads it from there
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await createClient()
          .storage.from("memories")
          .upload(path, file, { contentType: file.type });
        if (uploadError) {
          console.error("upload:", uploadError);
          setError("Couldn't upload your photo. If your last try failed, wait a few minutes and try again.");
          return;
        }

        result = await makeMemory(planId, path);
      } catch {
        setError(OFFLINE);
        return;
      }
      if ("error" in result) {
        setError(result.error);
      } else {
        setMemory(result.memory);
        setWait(COOLDOWN_MS / 60000);
      }
    });
  }

  if (memory) {
    return (
      <div className="flex flex-col items-center gap-4">
        <MemoryCard photoUrl={memory.photoUrl} caption={memory.caption} />
        <Link href="/memories?view=mine" className="text-sm underline underline-offset-4">
          See my memories
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <label
        className={`rounded-full bg-black px-8 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 ${
          loading || wait > 0 ? "pointer-events-none opacity-30" : "cursor-pointer"
        }`}
      >
        {loading ? "Writing a caption…" : wait > 0 ? `Next photo in ${wait} min` : "Upload a photo"}
        <input
          type="file"
          accept={Object.keys(PHOTO_TYPES).join(",")}
          onChange={onFileChange}
          disabled={loading || wait > 0}
          className="hidden"
        />
      </label>
      {loading ? (
        <p className="-mt-2 animate-pulse text-sm text-zinc-500">{THINKING[line]}</p>
      ) : (
        <p className="-mt-4 text-xs text-zinc-500">JPG, PNG or WebP, up to 5 MB · 1 photo per hour</p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
