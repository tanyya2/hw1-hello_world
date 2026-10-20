"use client";

import { useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Chip from "@/app/components/Chip";
import LocationPicker from "./LocationPicker";
import PlaceList from "./PlaceList";
import PlanCard from "./PlanCard";
import VoteButtons from "@/app/plans/VoteButtons";
import { BUDGETS, CATEGORIES, HOURS, RADII_MILES, type Category } from "./nyc";
import { findPlaces, type PlacesResult } from "./places";
import { generatePlan, type Plan, type PlanResult } from "./plan";
import type { Place } from "./geoapify";
import type { Spot } from "./geocode";

const PlaceMap = dynamic(() => import("./PlaceMap"), {
  ssr: false,
  loading: () => <div className="h-96 w-full rounded-2xl border border-zinc-200 dark:border-zinc-800" />,
});

const COUNTS = [10, 20, 50];
const OFFLINE = "Something went wrong. Check your connection and try again.";

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

// `intro` (heading and description) shows until a location is picked
export default function Explorer({ intro }: { intro: React.ReactNode }) {
  // Shared by both modes
  const [spot, setSpot] = useState<Spot | null>(null);
  const [radius, setRadius] = useState<number>(1);
  const [mode, setMode] = useState<"plan" | "places">("plan");
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();

  // Find places
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [count, setCount] = useState(20);
  const [view, setView] = useState<"list" | "map">("list");

  // Make a plan
  const [purpose, setPurpose] = useState("");
  const [hours, setHours] = useState<number>(2);
  const [budget, setBudget] = useState<string>("$$");
  const [plan, setPlan] = useState<Plan | null>(null);

  const shown = useMemo(() => (places ? closest(places, count) : []), [places, count]);

  // Places no longer match once the search changes
  function clearPlaces() {
    setPlaces(null);
    setError(null);
  }

  function toggleCategory(category: Category) {
    setCategories((current) =>
      current.includes(category) ? current.filter((c) => c !== category) : [...current, category]
    );
    clearPlaces();
  }

  function search() {
    if (!spot) return;
    startLoading(async () => {
      let result: PlacesResult;
      try {
        result = await findPlaces(spot.lat, spot.lon, radius, categories);
      } catch {
        result = { error: OFFLINE };
      }
      if ("error" in result) {
        setError(result.error);
      } else {
        setPlaces(result.places);
        setError(null);
      }
    });
  }

  function makePlan() {
    if (!spot) return;
    startLoading(async () => {
      let result: PlanResult;
      try {
        result = await generatePlan({
          lat: spot.lat,
          lon: spot.lon,
          label: spot.label,
          radiusMiles: radius,
          categories,
          purpose,
          hours,
          budget,
        });
      } catch {
        result = { error: OFFLINE };
      }
      if ("error" in result) {
        setError(result.error);
      } else {
        setPlan(result.plan);
        setError(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {!spot && <div className="mb-4">{intro}</div>}

      <LocationPicker
        spot={spot}
        onChange={(next) => {
          setSpot(next);
          clearPlaces();
        }}
      />

      {/* Picked before the location; "Change" brings it back */}
      {!spot && (
        <Row label="Within">
          {RADII_MILES.map((miles) => (
            <Chip key={miles} selected={radius === miles} onClick={() => setRadius(miles)}>
              {miles === 1 ? "1 mile" : `${miles} miles`}
            </Chip>
          ))}
        </Row>
      )}

      <div className="flex justify-center border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <div className="flex gap-1 rounded-full border border-zinc-300 p-1 dark:border-zinc-700">
          {(["plan", "places"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              aria-pressed={mode === m}
              className={`rounded-full px-5 py-1.5 text-sm font-medium transition ${
                mode === m
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              {m === "places" ? "Find places" : "Make a plan"}
            </button>
          ))}
        </div>
      </div>

      {mode === "plan" && (
        <>
          <input
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            maxLength={200}
            placeholder="What for?"
            aria-label="What for"
            className="mx-auto w-full rounded-full border border-zinc-300 bg-transparent px-4 py-2.5 text-center sm:w-1/2 text-sm outline-none transition placeholder:text-zinc-400 focus:border-black dark:border-zinc-700 dark:focus:border-white"
          />
          <Row label="Time">
            {HOURS.map((h) => (
              <Chip key={h} selected={hours === h} onClick={() => setHours(h)}>
                {h}h
              </Chip>
            ))}
          </Row>
          <Row label="Budget">
            {BUDGETS.map((b) => (
              <Chip key={b} selected={budget === b} onClick={() => setBudget(b)}>
                {b}
              </Chip>
            ))}
          </Row>
        </>
      )}

      <Row label={mode === "places" ? "Looking for" : "Include (optional)"}>
        {(Object.keys(CATEGORIES) as Category[]).map((category) => (
          <Chip key={category} selected={categories.includes(category)} onClick={() => toggleCategory(category)}>
            {CATEGORIES[category].label}
          </Chip>
        ))}
      </Row>

      <button
        onClick={mode === "places" ? search : makePlan}
        disabled={!spot || loading || (mode === "places" && categories.length === 0)}
        className="mx-auto rounded-full bg-black px-8 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-30 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {mode === "places"
          ? loading ? "Searching…" : "Search"
          : loading ? "Making your plan…" : "Generate plan"}
      </button>

      {error && <p role="alert" className="text-sm text-zinc-600 dark:text-zinc-400">{error}</p>}

      {mode === "plan" && plan && (
        <PlanCard plan={plan}>
          <VoteButtons key={plan.id} planId={plan.id} initial={{ up: 0, down: 0, mine: null }} signedIn />
        </PlanCard>
      )}

      {mode === "places" && places && places.length === 0 && (
        <p className="text-sm text-zinc-500">Nothing found nearby. Try a bigger distance or other categories.</p>
      )}

      {mode === "places" && places && places.length > 0 && spot && (
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

          {view === "list" ? (
            <PlaceList places={shown} />
          ) : (
            <PlaceMap center={spot} radiusMiles={radius} places={shown} />
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="mr-1 text-sm text-zinc-500">{label}</span>
      {children}
    </div>
  );
}
