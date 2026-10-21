"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Chip from "@/app/components/Chip";
import LocationPicker from "@/app/explore/LocationPicker";
import type { Spot } from "@/app/explore/geocode";
import { BUDGETS, CATEGORIES, RADII_MILES, type Category } from "@/app/explore/nyc";
import { generatePlan, type PlanResult } from "@/app/explore/plan";

const IDEAS = ["Coffee and books", "Cheap date", "Quick lunch", "Night out"];

// One centered screen that fits without scrolling:
// where → distance → vibe → budget → categories → more filters
export default function PlanMaker() {
  const [spot, setSpot] = useState<Spot | null>(null);
  const [purpose, setPurpose] = useState("");
  const [radius, setRadius] = useState<number>(1);
  const [budget, setBudget] = useState<string>("$$");
  const [categories, setCategories] = useState<Category[]>([]);
  const [openNow, setOpenNow] = useState(true);
  const [more, setMore] = useState(false);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();

  function makePlan() {
    if (!spot) {
      setError("Pick where to start first.");
      return;
    }
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
          budget,
          openNow,
        });
      } catch {
        result = { error: "Something went wrong. Check your connection and try again." };
      }
      if ("error" in result) {
        setError(result.error);
      } else {
        // The new plan's own page, with everything on it
        router.push(`/plans/${result.plan.id}`);
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <h1 className="m-0 font-serif text-3xl leading-tight font-medium sm:text-4xl">What are you in the mood for?</h1>

      <div className="w-full max-w-lg">
        <LocationPicker
          spot={spot}
          onChange={(next) => {
            setSpot(next);
            setError(null);
          }}
        />
      </div>

      <Row label="Within">
        {RADII_MILES.map((miles) => (
          <Chip key={miles} selected={radius === miles} onClick={() => setRadius(miles)}>
            {miles === 1 ? "1 mile" : `${miles} miles`}
          </Chip>
        ))}
      </Row>

      <div className="flex w-full flex-col items-center gap-2">
        <input
          value={purpose}
          onChange={(event) => setPurpose(event.target.value)}
          maxLength={200}
          placeholder="What's the vibe? e.g. quiet coffee, then something outdoors"
          aria-label="What's the vibe"
          className="h-10 w-full max-w-lg rounded-full border border-line-strong bg-transparent px-4 text-center text-[15px] outline-none transition placeholder:text-muted focus:border-ink"
        />
        <div className="flex flex-wrap justify-center gap-1.5">
          {IDEAS.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => setPurpose(idea)}
              className="h-7 rounded-full border border-dashed border-[#b8ae9a] px-2.5 text-xs text-ink-soft transition hover:border-ink hover:text-ink"
            >
              {idea}
            </button>
          ))}
        </div>
      </div>

      <Row label="Budget">
        {BUDGETS.map((b) => (
          <Chip key={b} selected={budget === b} onClick={() => setBudget(b)}>
            {b}
          </Chip>
        ))}
      </Row>

      <Row label="Include">
        {(Object.keys(CATEGORIES) as Category[]).map((category) => (
          <Chip
            key={category}
            selected={categories.includes(category)}
            onClick={() =>
              setCategories((current) =>
                current.includes(category) ? current.filter((c) => c !== category) : [...current, category]
              )
            }
          >
            {CATEGORIES[category].label}
          </Chip>
        ))}
      </Row>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => setMore(!more)}
          aria-expanded={more}
          className="flex items-center gap-1.5 text-sm text-ink-soft transition hover:text-ink"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
            <path strokeLinecap="round" d="M4 7h10M18 7h2M4 17h4M12 17h8" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="10" cy="17" r="2" />
          </svg>
          More filters
          <span aria-hidden="true" className={`transition ${more ? "rotate-180" : ""}`}>
            ▾
          </span>
        </button>
        {more && (
          <div className="flex items-center gap-3 rounded-full border border-line bg-card px-4 py-2">
            <span className="text-sm">Only places open now</span>
            <button
              type="button"
              role="switch"
              aria-checked={openNow}
              aria-label="Only places open now"
              onClick={() => setOpenNow(!openNow)}
              className={`relative h-6 w-11 rounded-full transition ${openNow ? "bg-accent" : "bg-line-strong"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${openNow ? "translate-x-5" : ""}`}
              />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={makePlan}
          disabled={loading}
          className="h-12 rounded-full bg-accent px-8 text-base font-semibold text-white transition hover:bg-[#174634] disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? "Making your plan…" : "Make my plan"}
        </button>
        {error && (
          <p role="alert" className="m-0 text-sm text-ink-soft">
            {error}
          </p>
        )}
      </div>

    </div>
  );
}

// A label with its options on one line (wraps on small screens)
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="mr-1 text-sm text-muted">{label}</span>
      {children}
    </div>
  );
}
