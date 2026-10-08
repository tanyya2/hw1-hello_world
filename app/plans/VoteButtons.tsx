"use client";

import { useState, useTransition } from "react";
import { vote } from "./actions";
import type { Tally } from "./votes";

type Props = {
  planId: number;
  initial: Tally;
  signedIn: boolean;
};

export default function VoteButtons({ planId, initial, signedIn }: Props) {
  const [tally, setTally] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startVote] = useTransition();

  function cast(value: 1 | -1) {
    startVote(async () => {
      try {
        const result = await vote(planId, value);
        if ("error" in result) {
          setError(result.error);
        } else {
          setTally(result);
          setError(null);
        }
      } catch {
        setError("Something went wrong. Check your connection and try again.");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span className="mr-auto text-xs text-zinc-500">{error}</span>}
      {!signedIn && <span className="mr-auto text-xs text-zinc-500">Sign in to vote</span>}
      <VoteButton label="Upvote" count={tally.up} active={tally.mine === 1} disabled={!signedIn || pending} onClick={() => cast(1)}>
        <path strokeLinejoin="round" d="M7 10v11H3V10h4zm0 0 4-8a2 2 0 0 1 2 2v4h6a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 17.6 21H7" />
      </VoteButton>
      <VoteButton label="Downvote" count={tally.down} active={tally.mine === -1} disabled={!signedIn || pending} onClick={() => cast(-1)}>
        <path strokeLinejoin="round" d="M17 14V3h4v11h-4zm0 0-4 8a2 2 0 0 1-2-2v-4H5a2 2 0 0 1-2-2.3l1.4-8A2 2 0 0 1 6.4 3H17" />
      </VoteButton>
    </div>
  );
}

type ButtonProps = {
  label: string;
  count: number;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function VoteButton({ label, count, active, disabled, onClick, children }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition disabled:cursor-default ${
        active
          ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
          : "border-zinc-300 text-zinc-600 enabled:hover:border-black dark:border-zinc-700 dark:text-zinc-400 dark:enabled:hover:border-white"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
        {children}
      </svg>
      {count}
    </button>
  );
}
