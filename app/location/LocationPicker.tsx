"use client";

import { useState, useTransition } from "react";
import Chip from "@/app/components/Chip";
import { reverseGeocode, searchNeighborhood, type LookupResult, type Spot } from "./actions";

const RADII = [
  { miles: 1, label: "1 mile" },
  { miles: 2, label: "2 miles" },
  { miles: 5, label: "5 miles" },
];

// Browser geolocation error codes → what to tell the user
const GEO_ERRORS: Record<number, string> = {
  1: "Location access is blocked. Allow it in your browser settings, or type a neighborhood.",
  2: "Couldn't figure out where you are. Try typing a neighborhood.",
  3: "Finding your location took too long. Try again, or type a neighborhood.",
};

export default function LocationPicker() {
  const [spot, setSpot] = useState<Spot | null>(null);
  const [radius, setRadius] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [searching, startSearch] = useTransition();
  const busy = locating || searching;

  // Server calls can fail outright (e.g. offline) — show a message instead of hanging
  async function lookup(request: () => Promise<LookupResult>) {
    let result: LookupResult;
    try {
      result = await request();
    } catch {
      result = { error: "Something went wrong. Check your connection and try again." };
    }
    if ("error" in result) {
      setError(result.error);
    } else {
      setSpot(result.spot);
      setError(null);
    }
  }

  function locateMe() {
    if (!navigator.geolocation) {
      setError("Your browser can't share its location. Type a neighborhood instead.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await lookup(() => reverseGeocode(position.coords.latitude, position.coords.longitude));
        setLocating(false);
      },
      (geoError) => {
        setError(GEO_ERRORS[geoError.code] ?? GEO_ERRORS[2]);
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }

  return (
    <section className="flex flex-col items-center gap-6">
      {spot ? (
        <p className="flex items-center justify-center gap-2">
          <PinIcon />
          <span className="font-medium">{spot.label}</span>
          <span className="text-zinc-400">·</span>
          <button
            onClick={() => setSpot(null)}
            className="text-sm text-zinc-500 underline underline-offset-4 hover:text-black dark:hover:text-white"
          >
            Change
          </button>
        </p>
      ) : (
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <button
            onClick={locateMe}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            <PinIcon />
            {locating ? "Finding you…" : "Use my location"}
          </button>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              startSearch(() => lookup(() => searchNeighborhood(query)));
            }}
            className="flex flex-1 gap-2"
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Neighborhood or address"
              aria-label="Neighborhood or address"
              className="min-w-0 flex-1 rounded-full border border-zinc-300 bg-transparent px-4 py-2.5 text-sm outline-none transition placeholder:text-zinc-400 focus:border-black dark:border-zinc-700 dark:focus:border-white"
            />
            <button
              type="submit"
              disabled={busy || !query.trim()}
              className="rounded-full border border-zinc-300 px-5 text-sm font-medium transition hover:border-black disabled:opacity-40 dark:border-zinc-700 dark:hover:border-white"
            >
              {searching ? "…" : "Go"}
            </button>
          </form>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-zinc-600 dark:text-zinc-400">{error}</p>}

      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="mr-1 text-sm text-zinc-500">Within</span>
        {RADII.map((r) => (
          <Chip key={r.miles} selected={radius === r.miles} onClick={() => setRadius(r.miles)}>
            {r.label}
          </Chip>
        ))}
      </div>
    </section>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <path strokeLinejoin="round" d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
