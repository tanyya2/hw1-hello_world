"use server";

import { createClient } from "@/utils/supabase/server";
import { fetchNearby, type Place } from "./geoapify";
import { GeminiBusyError, askGemini, buildPrompt, parsePlan, type GeminiPlan } from "./gemini";
import { BUDGETS, CATEGORIES, HOURS, RADII_MILES, inNyc, type Category } from "./nyc";

// Gemini picks from at most this many nearby places
const MAX_PLACES = 30;

export type PlanInput = {
  lat: number;
  lon: number;
  label: string;
  radiusMiles: number;
  categories: Category[];
  purpose: string;
  hours: number;
  budget: string;
};

export type PlanStop = {
  name: string;
  category: Category;
  miles: number;
  address: string | null;
  minutes: number;
  rating: number | null;
  note: string;
};

// Saved as JSON in plans.content
export type PlanContent = {
  title: string;
  stops: PlanStop[];
  tip: string;
  // Google's search suggestions (HTML), required next to grounded answers
  searchSuggestions: string | null;
};

export type Plan = PlanContent & { id: number; hours: number; budget: string };

export type PlanResult = { plan: Plan } | { error: string };

// Enforce the plan rules (see buildPrompt), trimming extras.
// Returns null when Gemini's plan can't satisfy them.
function checkStops(plan: GeminiPlan | null, places: Place[], picked: Category[]): GeminiPlan | null {
  if (!plan) return null;
  const categoryOf = (stop: GeminiPlan["stops"][number]) => places[stop.place - 1].category;

  // The same place twice → keep the first
  const seenPlaces = new Set<number>();
  let stops = plan.stops.filter((stop) => {
    if (seenPlaces.has(stop.place)) return false;
    seenPlaces.add(stop.place);
    return true;
  });

  if (picked.length === 1 || picked.length === 2) {
    // 3 places from the picked categories, each category at least once
    stops = stops.filter((stop) => picked.includes(categoryOf(stop))).slice(0, 3);
    const covered = picked.every((category) => stops.some((stop) => categoryOf(stop) === category));
    return stops.length === 3 && covered ? { ...plan, stops } : null;
  }

  // Diverse: one place per category — every picked one, or 3–4 of any kind
  const seen = new Set<Category>();
  stops = stops.filter((stop) => {
    const category = categoryOf(stop);
    if ((picked.length > 0 && !picked.includes(category)) || seen.has(category)) return false;
    seen.add(category);
    return true;
  });
  if (picked.length === 0) stops = stops.slice(0, 4);
  const complete = picked.length > 0 ? seen.size === picked.length : stops.length >= 3;
  return complete ? { ...plan, stops } : null;
}

export async function generatePlan(input: PlanInput): Promise<PlanResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { error: "Sign in to make a plan." };

  const { lat, lon, radiusMiles, hours, budget } = input;
  const label = String(input.label ?? "").slice(0, 100);
  const purpose = String(input.purpose ?? "").trim();
  if (!inNyc(lat, lon)) return { error: "Pick a location in NYC." };
  if (!RADII_MILES.includes(radiusMiles as (typeof RADII_MILES)[number])) return { error: "Pick a distance." };
  if (!HOURS.includes(hours as (typeof HOURS)[number])) return { error: "Pick how much time you have." };
  if (!BUDGETS.includes(budget as (typeof BUDGETS)[number])) return { error: "Pick a budget." };
  if (purpose.length > 200) return { error: "Keep \"What for\" under 200 characters." };

  // No categories picked → a mix of everything, and Gemini decides what fits
  const picked = [...new Set(input.categories ?? [])].filter((category) => category in CATEGORIES);
  const categories = picked.length > 0 ? picked : (Object.keys(CATEGORIES) as Category[]);
  const perCategory = Math.max(4, Math.floor(MAX_PLACES / categories.length));

  try {
    const places = (await fetchNearby(categories, lat, lon, radiusMiles, perCategory)).slice(0, MAX_PLACES);
    if (places.length === 0) return { error: "Nothing found nearby. Try a bigger distance or other categories." };

    const promptFor = (search: boolean) => buildPrompt({ start: label, purpose, hours, budget }, places, picked, search);

    // If Gemini's plan breaks the rules (too few places, missing a category), ask once more
    let reply = await askGemini(promptFor);
    let result = checkStops(parsePlan(reply.text, places.length), places, picked);
    if (!result) {
      reply = await askGemini(promptFor);
      result = checkStops(parsePlan(reply.text, places.length), places, picked);
    }
    if (!result) {
      console.error("generatePlan: unusable Gemini reply", reply.text);
      return { error: "Couldn't make a plan this time. Try again." };
    }

    const stops: PlanStop[] = result.stops.map((stop) => {
      const place = places[stop.place - 1];
      return {
        name: place.name,
        category: place.category,
        miles: place.miles,
        address: place.address,
        minutes: stop.minutes,
        rating: stop.rating,
        note: stop.note,
      };
    });
    const content: PlanContent = {
      title: result.title,
      stops,
      tip: result.tip,
      searchSuggestions: reply.searchSuggestions,
    };

    // RLS: user_id defaults to the logged-in user, and users can only insert their own plans
    const { data: saved, error } = await supabase
      .from("plans")
      .insert({
        neighborhood: label,
        inputs: { radiusMiles, categories: picked, purpose, hours, budget },
        places,
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

    return { plan: { id: saved.id, ...content, hours, budget } };
  } catch (err) {
    console.error("generatePlan:", err);
    if (err instanceof GeminiBusyError) return { error: "The AI is out of free requests for today. Try again tomorrow." };
    return { error: "Couldn't make a plan right now. Try again in a moment." };
  }
}
