"use client";

import { useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Chip from "@/app/components/Chip";
import LocationPicker from "./LocationPicker";
import PlaceList from "./PlaceList";
import { CATEGORIES, RADII_MILES, type Category } from "./nyc";
import { findPlaces, type Place, type PlacesResult } from "./places";
import type { Spot } from "./geocode";

const PlaceMap = dynamic(() => import("./PlaceMap"), {
  ssr: false,
  loading: () => <div className="h-96 w-full rounded-2xl border border-zinc-200 dark:border-zinc-800" />,
});

const COUNTS = [10, 20, 50];

// Take the closest places evenly from each category, so 10 results with
// Coffee + Museums isn't 10 coffee shops. Lists arrive sorted by distance.
function closest(places: Place[], count: number) {
  const byCategory = new Map<Category, Place[]>();
  for (const place of places) {
    byCategory.set(place.category, [...(byCategory.get(place.category) ?? []), place]);
  }
  const lists = [...byCategory.values()];
  const picked: Place[] = [];
  for (let i = 0; picked.length < count && lists.some((list) => list[i]); i++) {
    for (const list of lists) {
      if (list[i] && picked.length < count) picked.push(list[i]);
    }
  }
  return picked.sort((a, b) => a.miles - b.miles);
}

export default function Explorer() {
  const [spot, setSpot] = useState<Spot | null>(null);
  const [radius, setRadius] = useState<number>(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [count, setCount] = useState(20);
  const [view, setView] = useState<"list" | "map">("list");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();

  const shown = useMemo(() => (places ? closest(places, count) : []), [places, count]);
  const selectedCount = shown.filter((place) => selected.has(place.id)).length;

  // Results no longer match once the search changes
  function clearResults() {
    setPlaces(null);
    setSelected(new Set());
    setError(null);
  }

  function toggleCategory(category: Category) {
    setCategories((current) =>
      current.includes(category) ? current.filter((c) => c !== category) : [...current, category]
    );
    clearResults();
  }

  function togglePlace(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  function search() {
    if (!spot) return;
    startLoading(async () => {
      let result: PlacesResult;
      try {
        result = await findPlaces(spot.lat, spot.lon, radius, categories);
      } catch {
        result = { error: "Something went wrong. Check your connection and try again." };
      }
      if ("error" in result) {
        setError(result.error);
      } else {
        setPlaces(result.places);
        setSelected(new Set());
        setError(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <LocationPicker
        spot={spot}
        onChange={(next) => {
          setSpot(next);
          clearResults();
        }}
      />

      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="mr-1 text-sm text-zinc-500">Within</span>
        {RADII_MILES.map((miles) => (
          <Chip
            key={miles}
            selected={radius === miles}
            onClick={() => {
              setRadius(miles);
              clearResults();
            }}
          >
            {miles === 1 ? "1 mile" : `${miles} miles`}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="mr-1 text-sm text-zinc-500">Looking for</span>
        {(Object.keys(CATEGORIES) as Category[]).map((category) => (
          <Chip key={category} selected={categories.includes(category)} onClick={() => toggleCategory(category)}>
            {CATEGORIES[category].label}
          </Chip>
        ))}
      </div>

      <button
        onClick={search}
        disabled={!spot || categories.length === 0 || loading}
        className="mx-auto rounded-full bg-black px-8 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-30 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {loading ? "Finding places…" : "Find places"}
      </button>

      {error && <p role="alert" className="text-sm text-zinc-600 dark:text-zinc-400">{error}</p>}

      {places && places.length === 0 && (
        <p className="text-sm text-zinc-500">Nothing found nearby. Try a bigger distance or other categories.</p>
      )}

      {places && places.length > 0 && spot && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="mr-1 text-sm text-zinc-500">Show</span>
              {COUNTS.map((n) => (
                <Chip key={n} selected={count === n} onClick={() => setCount(n)}>
                  {n}
                </Chip>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Chip selected={view === "list"} onClick={() => setView("list")}>
                List
              </Chip>
              <Chip selected={view === "map"} onClick={() => setView("map")}>
                Map
              </Chip>
            </div>
          </div>

          <p className="text-left text-sm text-zinc-500">
            {selectedCount > 0
              ? `${selectedCount} selected for your plan`
              : `Tick places for your plan, or we'll use the closest ${Math.min(20, shown.length)}.`}
            {view === "map" && " Tap a pin to select it."}
          </p>

          {view === "list" ? (
            <PlaceList places={shown} selected={selected} onToggle={togglePlace} />
          ) : (
            <PlaceMap center={spot} radiusMiles={radius} places={shown} selected={selected} onToggle={togglePlace} />
          )}
        </div>
      )}
    </div>
  );
}
