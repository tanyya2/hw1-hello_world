"use server";

import { createClient } from "@/utils/supabase/server";
import { fetchCategory, fetchMix, type Place } from "./google";
import { GOOGLE_LIMIT_ERROR, reserveGoogleRequests, type Reservation } from "./googleLimit";
import { GeminiBusyError, MODELS, askGemini, buildPrompt, parsePlan, type GeminiAttempt, type GeminiPlan, type Model } from "./gemini";
import { BUDGETS, CATEGORIES, RADII_MILES, STOPS, inNyc, type Category } from "./nyc";
import { walkMinutes, walkingOrder } from "./walking";

export type PlanInput = {
  lat: number;
  lon: number;
  label: string;
  // The start is the user's own location (not a typed neighborhood or address)
  myLocation?: boolean;
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
  // Our estimate of the walk here from the previous stop. None for the first stop: the start
  // may be a whole neighborhood, not a real spot. None on older plans either.
  walkMinutes?: number;
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

  // Picked: one place from each picked category (more than `max` picked → `max` of them)
  const seen = new Set<Category>();
  stops = stops
    .filter((stop) => {
      if (!picked.includes(categoryOf(stop)) || seen.has(categoryOf(stop))) return false;
      seen.add(categoryOf(stop));
      return true;
    })
    .slice(0, max);
  return stops.length === Math.min(picked.length, max) ? { ...plan, stops } : null;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Moves a place that fits a missing category too (a pub counted as a restaurant is also a
// bar) into it, as long as the category it leaves still has another place
function fillMissing(places: Place[], missing: Category[]) {
  for (const category of missing) {
    const spare = places.find(
      (place) => place.fits.includes(category) && places.filter((other) => other.category === place.category).length > 1,
    );
    if (spare) spare.category = category;
  }
}

// The Gemini models to try, in the order set on the admin's LLM models page (active ones only).
// Can't read them, or none are active → the list in gemini.ts, so plans keep working.
async function loadModels(supabase: Supabase): Promise<Model[]> {
  const { data, error } = await supabase
    .from("llm_models")
    .select("name, thinking_off, llm_providers!inner(name)")
    .eq("is_active", true)
    .eq("llm_providers.name", "Google Gemini")
    .order("sort_order");
  if (error) console.error("generatePlan: couldn't read llm_models", error);
  return data?.length ? data.map((model) => ({ name: model.name, thinkingOff: model.thinking_off })) : MODELS;
}

// For the admin's log: every Gemini call, and the real reason when a plan fails
// (users only see a short message)
type RunLog = { attempts: GeminiAttempt[]; reason?: string };

// Makes the plan, then logs the request and every Gemini call for the admin
export async function generatePlan(input: PlanInput): Promise<PlanResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { error: "Sign in to make a plan." };

  const started = Date.now();
  const log: RunLog = { attempts: [] };
  const result = await makePlan(supabase, input, log);
  await logRequest(supabase, input, result, log, Date.now() - started);
  return result;
}

// A failed log never stops the plan: errors only go to the server console
async function logRequest(supabase: Supabase, input: PlanInput, result: PlanResult, log: RunLog, ms: number) {
  const { attempts } = log;
  try {
    const { data: chain } = await supabase.from("prompt_chains").select("id").eq("name", "OutNYC plan").maybeSingle();
    const { data: request, error } = await supabase
      .from("generation_requests")
      .insert({
        chain_id: chain?.id ?? null,
        neighborhood: String(input.label ?? "").slice(0, 100) || null,
        inputs: { radiusMiles: input.radiusMiles, categories: input.categories, purpose: input.purpose, budget: input.budget, openNow: input.openNow },
        status: "plan" in result ? "success" : "failed",
        // What the user saw, then the real reason
        error: "error" in result ? [result.error, log.reason && `Reason: ${log.reason}`].filter(Boolean).join("\n") : null,
        plan_id: "plan" in result ? result.plan.id : null,
        duration_ms: ms,
      })
      .select("id")
      .single();
    if (error) throw error;
    if (attempts.length === 0) return;
    const { error: responsesError } = await supabase.from("llm_responses").insert(
      attempts.map((attempt) => ({
        request_id: request.id,
        model: attempt.model,
        ok: attempt.ok,
        http_status: attempt.httpStatus,
        response_text: attempt.text,
        duration_ms: attempt.ms,
      })),
    );
    if (responsesError) throw responsesError;
  } catch (err) {
    console.error("generatePlan: logging failed", err);
  }
}

// No Google requests reserved: today's cap is used up, or it couldn't be checked.
// Couldn't check → no Google search either (it wouldn't be counted), and the real error goes to the log
function notReserved(reservation: Exclude<Reservation, "ok">, log: RunLog): PlanResult {
  if (reservation === "limit") return { error: GOOGLE_LIMIT_ERROR };
  log.reason = `Couldn't check the Google limit: ${reservation.error}`;
  return { error: "Couldn't make a plan right now. Try again in a moment." };
}

async function makePlan(supabase: Supabase, input: PlanInput, log: RunLog): Promise<PlanResult> {
  const { attempts } = log;
  const { lat, lon, radiusMiles, budget } = input;
  const label = String(input.label ?? "").slice(0, 100);
  const purpose = String(input.purpose ?? "").trim();
  if (!inNyc(lat, lon)) return { error: "Pick a location in NYC." };
  if (!RADII_MILES.includes(radiusMiles as (typeof RADII_MILES)[number])) return { error: "Pick a distance." };
  if (!BUDGETS.includes(budget as (typeof BUDGETS)[number])) return { error: "Pick a budget." };
  if (purpose.length > 200) return { error: "Keep \"What for\" under 200 characters." };

  // No categories picked → a mix of everything, and Gemini decides what fits.
  // Just one isn't a plan (that's a list of spots), so it takes 2 or more
  const chosen = [...new Set(input.categories ?? [])].filter((category) => category in CATEGORIES);
  const categories = chosen.length > 0 ? chosen : (Object.keys(CATEGORIES) as Category[]);
  if (chosen.length === 1) return { error: "Pick at least 2 or none" };

  const reserved = await reserveGoogleRequests(supabase, 1);
  if (reserved !== "ok") return notReserved(reserved, log);

  try {
    // One Google request: the 20 most popular places nearby across all the categories
    // Leave out places that are closed right now
    const openNow = input.openNow !== false;
    const open = (list: Place[]) => (openNow ? list.filter((place) => place.openNow !== false) : list);
    let found = await fetchMix(categories, lat, lon, radiusMiles);
    let places = open(found);

    // Every picked category needs at least one open place. (More than 4 picked: only 4
    // can be used anyway, so none of this.) A category can miss out when the others are
    // more popular (no coffee among 20 restaurants and museums) or when its places are
    // closed (bars at lunchtime). First a place that fits it too can fill it (a pub
    // counted as a restaurant); otherwise one extra request for each one still missing.
    const allNeeded = chosen.length <= STOPS.max;
    const missingFrom = (list: Place[]) =>
      allNeeded ? chosen.filter((category) => !list.some((place) => place.category === category)) : [];
    fillMissing(places, missingFrom(places));
    const missing = missingFrom(places);
    if (missing.length > 0) {
      const reservedMore = await reserveGoogleRequests(supabase, missing.length);
      if (reservedMore !== "ok") return notReserved(reservedMore, log);
      const extra = (await Promise.all(missing.map((category) => fetchCategory(category, lat, lon, radiusMiles)))).flat();
      const seen = new Set(found.map((place) => place.id));
      const fresh = extra.filter((place) => !seen.has(place.id));
      found = [...found, ...fresh];
      places = [...places, ...open(fresh)];
    }
    // For the log if this fails: what Google found, per category
    const counts = categories
      .map((category) => {
        const all = found.filter((place) => place.category === category).length;
        const ok = places.filter((place) => place.category === category).length;
        return all ? `${CATEGORIES[category].label} ${openNow ? `${ok} open of ${all}` : all}` : "";
      })
      .filter(Boolean);
    const foundNote =
      `Google found ${found.length} places${counts.length ? ` (${counts.join(", ")})` : ""}` +
      (missing.length ? `; extra search for ${missing.map((category) => CATEGORIES[category].label).join(", ")}` : "");
    if (places.length === 0) {
      log.reason = foundNote;
      return { error: `Nothing ${openNow ? "open " : ""}nearby right now. Try a bigger distance or other categories.` };
    }

    const empty = missingFrom(places);
    if (empty.length > 0) {
      const names = empty.map((category) => CATEGORIES[category].label).join(" or ");
      log.reason = foundNote;
      return {
        error: `No ${openNow ? "open " : ""}${names} places nearby. Try a bigger distance${openNow ? " or turn off Open now" : ""}.`,
      };
    }
    const picked = chosen.filter((category) => places.some((place) => place.category === category));
    // More than 4 picked, but only one of them has places nearby: that's not a plan either
    if (picked.length === 1) {
      log.reason = foundNote;
      return { error: `Not enough ${openNow ? "open " : ""}places nearby. Try a bigger distance or other categories.` };
    }

    const prompt = buildPrompt({ start: label, purpose, budget }, places, picked);

    // If Gemini's plan breaks the rules (too few places, missing a category), ask once more
    const models = await loadModels(supabase);
    let reply = await askGemini(prompt, attempts, models);
    let result = checkStops(parsePlan(reply.text, places.length), places, picked);
    if (!result) {
      reply = await askGemini(prompt, attempts, models);
      result = checkStops(parsePlan(reply.text, places.length), places, picked);
    }
    if (!result) {
      console.error("generatePlan: unusable Gemini reply", reply.text);
      log.reason = "Gemini's reply broke the plan rules twice (wrong number of stops, a missing category or not JSON). Its replies are in LLM responses.";
      return { error: "Couldn't make a plan this time. Try again." };
    }

    // Gemini picks the stops; we set the walking order
    const picks = walkingOrder(
      { lat, lon },
      result.stops.map((stop) => ({ stop, place: places[stop.place - 1] })),
      (pick) => pick.place,
    );
    // What we store: place id and name, plus Gemini's text
    const content: PlanContent = {
      title: result.title,
      stops: picks.map(({ stop, place }, i) => ({
        placeId: place.id,
        name: place.name,
        category: place.category,
        minutes: stop.minutes,
        walkMinutes: i > 0 ? walkMinutes(picks[i - 1].place, place) : undefined,
        note: stop.note,
      })),
      tip: result.tip,
    };

    // RLS: user_id defaults to the logged-in user, and users can only insert their own plans
    const { data: saved, error } = await supabase
      .from("plans")
      .insert({
        neighborhood: label,
        // lat/lon: the starting point (already rounded to ~100 m). Start walking begins there
        // only when it's the user's own location (myLocation), not the middle of a neighborhood.
        inputs: { lat, lon, myLocation: input.myLocation === true, radiusMiles, categories: chosen, purpose, budget, openNow },
        // The candidates Gemini picked from: place ids only (Google's terms)
        places: places.map((place) => ({ id: place.id, category: place.category })),
        // The prompt and model that actually produced this plan
        prompt,
        model: reply.model,
        content: JSON.stringify(content),
      })
      .select("id")
      .single();
    if (error) {
      console.error("generatePlan: saving failed", error);
      log.reason = `Saving the plan failed: ${error.message}`;
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
    log.reason = (err instanceof Error ? err.message : String(err)).slice(0, 2000);
    if (err instanceof GeminiBusyError) return { error: "The AI is out of free requests for today. Try again tomorrow." };
    return { error: "Couldn't make a plan right now. Try again in a moment." };
  }
}
