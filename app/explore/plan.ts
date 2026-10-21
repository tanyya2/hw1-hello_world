"use server";

import { createClient } from "@/utils/supabase/server";
import { fetchCategory, fetchMix, type Place } from "./google";
import { GOOGLE_LIMIT_ERROR, reserveGoogleRequests } from "./googleLimit";
import { GeminiBusyError, askGemini, buildPrompt, parsePlan, type GeminiPlan } from "./gemini";
import { BUDGETS, CATEGORIES, RADII_MILES, STOPS, inNyc, type Category } from "./nyc";

export type PlanInput = {
  lat: number;
  lon: number;
  label: string;
  radiusMiles: number;
  categories: Category[];
  purpose: string;
  budget: string;
  // Leave out places Google says are closed right now
  openNow: boolean;
};

// Saved per stop: the Google place id and name, plus our own text. Google's terms
// don't allow storing its other place data (rating, price, address…), so those
// are only on the plan just made. Plans from before the Google switch have
// OpenStreetMap data (miles, address) and Gemini's rating instead of a place id.
export type PlanStop = {
  placeId?: string;
  name: string;
  category: Category;
  minutes: number;
  note: string;
  miles?: number;
  address?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  price?: string | null;
  mapsUrl?: string | null;
};

// Saved as JSON in plans.content
export type PlanContent = {
  title: string;
  stops: PlanStop[];
  tip: string;
  // Google's search suggestions (HTML), required next to answers grounded in
  // Google Search. Only on plans from before the Google switch.
  searchSuggestions: string | null;
};

export type Plan = PlanContent & { id: number; budget: string };

export type PlanResult = { plan: Plan } | { error: string };

// Enforce the plan rules (see buildPrompt), trimming extras.
// Returns null when Gemini's plan can't satisfy them.
function checkStops(plan: GeminiPlan | null, places: Place[], picked: Category[]): GeminiPlan | null {
  if (!plan) return null;
  const { min, max } = STOPS;
  const categoryOf = (stop: GeminiPlan["stops"][number]) => places[stop.place - 1].category;

  // The same place twice → keep the first
  const seenPlaces = new Set<number>();
  let stops = plan.stops.filter((stop) => {
    if (seenPlaces.has(stop.place)) return false;
    seenPlaces.add(stop.place);
    return true;
  });

  // Nothing picked: min–max places of any kind (mixing is up to Gemini;
  // the 20 popular places nearby may not cover many kinds)
  if (picked.length === 0) {
    stops = stops.slice(0, max);
    return stops.length >= min ? { ...plan, stops } : null;
  }

  stops = stops.filter((stop) => picked.includes(categoryOf(stop)));

  // More picked than stops fit: `max` places, each from a different picked category
  if (picked.length > max) {
    const seen = new Set<Category>();
    stops = stops
      .filter((stop) => {
        if (seen.has(categoryOf(stop))) return false;
        seen.add(categoryOf(stop));
        return true;
      })
      .slice(0, max);
    return stops.length === max ? { ...plan, stops } : null;
  }

  // Otherwise: only picked categories, each at least once
  stops = stops.slice(0, max);
  const covered = picked.every((category) => stops.some((stop) => categoryOf(stop) === category));
  return stops.length >= Math.max(min, picked.length) && covered ? { ...plan, stops } : null;
}

export async function generatePlan(input: PlanInput): Promise<PlanResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { error: "Sign in to make a plan." };

  const { lat, lon, radiusMiles, budget } = input;
  const label = String(input.label ?? "").slice(0, 100);
  const purpose = String(input.purpose ?? "").trim();
  if (!inNyc(lat, lon)) return { error: "Pick a location in NYC." };
  if (!RADII_MILES.includes(radiusMiles as (typeof RADII_MILES)[number])) return { error: "Pick a distance." };
  if (!BUDGETS.includes(budget as (typeof BUDGETS)[number])) return { error: "Pick a budget." };
  if (purpose.length > 200) return { error: "Keep \"What for\" under 200 characters." };

  // No categories picked → a mix of everything, and Gemini decides what fits
  const chosen = [...new Set(input.categories ?? [])].filter((category) => category in CATEGORIES);
  const categories = chosen.length > 0 ? chosen : (Object.keys(CATEGORIES) as Category[]);

  if (!(await reserveGoogleRequests(supabase, 1))) return { error: GOOGLE_LIMIT_ERROR };

  try {
    // One Google request: the 20 most popular places nearby across all the categories
    let places = await fetchMix(categories, lat, lon, radiusMiles);

    // A picked category can miss out when the others are more popular (no coffee among
    // 20 restaurants and museums) → one extra request for each one that's missing
    // (More than 4 picked: only 4 can be used anyway, so no extra requests.)
    const allNeeded = chosen.length <= STOPS.max;
    const missing = allNeeded ? chosen.filter((category) => !places.some((place) => place.category === category)) : [];
    if (missing.length > 0) {
      if (!(await reserveGoogleRequests(supabase, missing.length))) return { error: GOOGLE_LIMIT_ERROR };
      const extra = (await Promise.all(missing.map((category) => fetchCategory(category, lat, lon, radiusMiles)))).flat();
      const seen = new Set(places.map((place) => place.id));
      places = [...places, ...extra.filter((place) => !seen.has(place.id))];
    }

    // Leave out places that are closed right now
    const openNow = input.openNow !== false;
    if (openNow) places = places.filter((place) => place.openNow !== false);
    if (places.length === 0) {
      return { error: `Nothing ${openNow ? "open " : ""}nearby right now. Try a bigger distance or other categories.` };
    }

    // Every picked category needs at least one place to choose from
    const empty = allNeeded ? chosen.filter((category) => !places.some((place) => place.category === category)) : [];
    if (empty.length > 0) {
      const names = empty.map((category) => CATEGORIES[category].label).join(" or ");
      return {
        error: `No ${openNow ? "open " : ""}${names} places nearby. Try a bigger distance${openNow ? " or turn off Open now" : ""}.`,
      };
    }
    const picked = chosen.filter((category) => places.some((place) => place.category === category));

    const promptFor = () => buildPrompt({ start: label, purpose, budget }, places, picked);

    // If Gemini's plan breaks the rules (too few places, missing a category), ask once more
    let reply = await askGemini(promptFor, { search: false });
    let result = checkStops(parsePlan(reply.text, places.length), places, picked);
    if (!result) {
      reply = await askGemini(promptFor, { search: false });
      result = checkStops(parsePlan(reply.text, places.length), places, picked);
    }
    if (!result) {
      console.error("generatePlan: unusable Gemini reply", reply.text);
      return { error: "Couldn't make a plan this time. Try again." };
    }

    const picks = result.stops.map((stop) => ({ stop, place: places[stop.place - 1] }));
    // What we store: place id and name, plus Gemini's text
    const content: PlanContent = {
      title: result.title,
      stops: picks.map(({ stop, place }) => ({
        placeId: place.id,
        name: place.name,
        category: place.category,
        minutes: stop.minutes,
        note: stop.note,
      })),
      tip: result.tip,
      searchSuggestions: null,
    };

    // RLS: user_id defaults to the logged-in user, and users can only insert their own plans
    const { data: saved, error } = await supabase
      .from("plans")
      .insert({
        neighborhood: label,
        inputs: { radiusMiles, categories: chosen, purpose, budget, openNow },
        // The candidates Gemini picked from: place ids only (Google's terms)
        places: places.map((place) => ({ id: place.id, category: place.category })),
        // The prompt and model that actually produced this plan
        prompt: reply.prompt,
        model: reply.model,
        content: JSON.stringify(content),
      })
      .select("id")
      .single();
    if (error) {
      console.error("generatePlan: saving failed", error);
      return { error: "Couldn't save your plan. Try again." };
    }

    // Shown right away, with Google's details for each stop (not stored)
    const stops: PlanStop[] = picks.map(({ place }, i) => ({
      ...content.stops[i],
      miles: place.miles,
      address: place.address,
      rating: place.rating,
      ratingCount: place.ratingCount,
      price: place.price,
      mapsUrl: place.mapsUrl,
    }));
    return { plan: { id: saved.id, ...content, stops, budget } };
  } catch (err) {
    console.error("generatePlan:", err);
    if (err instanceof GeminiBusyError) return { error: "The AI is out of free requests for today. Try again tomorrow." };
    return { error: "Couldn't make a plan right now. Try again in a moment." };
  }
}
