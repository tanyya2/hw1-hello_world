"use client";

import { useState, useTransition } from "react";
import { reverseGeocode, searchNeighborhood, type LookupResult, type Spot } from "./geocode";

// Browser geolocation error codes → what to tell the user
const GEO_ERRORS: Record<number, string> = {
  1: "Location access is blocked. Allow it in your browser settings, or type a neighborhood.",
  2: "Couldn't figure out where you are. Try typing a neighborhood.",
  3: "Finding your location took too long. Try again, or type a neighborhood.",
};

type Props = {
  spot: Spot | null;
  onChange: (spot: Spot | null) => void;
};

export default function LocationPicker({ spot, onChange }: Props) {
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
      onChange(result.spot);
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

  if (spot) {
    return (
      <p className="m-0 flex items-center justify-center gap-2">
        <PinIcon />
        <span className="font-medium">{spot.label}</span>
        <span className="text-muted">·</span>
        <button
          onClick={() => onChange(null)}
          className="text-sm text-muted underline underline-offset-4 hover:text-ink"
        >
          Change
        </button>
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <button
          onClick={locateMe}
          disabled={busy}
          className="flex h-10 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-card transition hover:bg-ink-soft disabled:opacity-50"
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
            className="h-10 min-w-0 flex-1 rounded-full border border-line-strong bg-transparent px-4 text-[15px] outline-none transition placeholder:text-muted focus:border-ink"
          />
          <button
            type="submit"
            disabled={busy || !query.trim()}
            className="h-10 rounded-full border border-line-strong px-4 text-sm font-medium transition hover:border-ink disabled:opacity-40"
          >
            {searching ? "…" : "Go"}
          </button>
        </form>
      </div>

      {error && <p role="alert" className="m-0 text-sm text-ink-soft">{error}</p>}
    </div>
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
