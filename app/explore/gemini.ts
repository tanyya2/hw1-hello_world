import type { Place } from "./geoapify";
import { CATEGORIES, type Category } from "./nyc";

// Server-only: reads the API key.
const GEMINI = "https://generativelanguage.googleapis.com/v1beta/models";

// Free-tier limits are small and per model (e.g. 20 requests/day), and Google
// Search lookups have their own daily limit. When one is used up we fall back
// to the next model. `thinkingOff` skips extended reasoning (much faster);
// the lite model doesn't accept that setting.
const MODELS = [
  { name: "gemini-2.5-flash", thinkingOff: true },
  { name: "gemini-3-flash-preview", thinkingOff: true },
  { name: "gemini-flash-latest", thinkingOff: true },
  { name: "gemini-flash-lite-latest", thinkingOff: false },
];

export type PlanRequest = {
  start: string;
  purpose: string;
  hours: number;
  budget: string;
};

// What Gemini sends back: stops point at places by their number in the list
export type GeminiPlan = {
  title: string;
  stops: { place: number; minutes: number; rating: number | null; note: string }[];
  tip: string;
};

// `required`: categories the user picked. Every plan has at least 3 different places:
// 1–2 categories → 3 places from them; 3+ → one per category; none → 3–4 from different categories.
// `search`: whether Gemini can use Google Search (for ratings) on this request.
export function buildPrompt(request: PlanRequest, places: Place[], required: Category[], search: boolean) {
  // Places grouped under category headings, numbered across the whole list
  const list = (Object.keys(CATEGORIES) as Category[])
    .filter((category) => places.some((place) => place.category === category))
    .map((category) => {
      const lines = places.flatMap((place, i) =>
        place.category === category
          ? [
              [`${i + 1}. ${place.name}`, place.cuisine, place.address, `${place.miles} mi away`, place.hours && `hours: ${place.hours}`]
                .filter(Boolean)
                .join(" | "),
            ]
          : []
      );
      return `${CATEGORIES[category].label}:\n${lines.join("\n")}`;
    })
    .join("\n\n");

  const labels = required.map((category) => CATEGORIES[category].label);
  const pick =
    required.length === 1
      ? `Pick exactly 3 different places, all from ${labels[0]}.`
      : required.length === 2
        ? `Pick exactly 3 different places from ${labels[0]} and ${labels[1]}, with at least one from each.`
        : required.length > 2
          ? `Pick exactly one place from each of these categories: ${labels.join(", ")} (${required.length} places total).`
          : "Pick 3 or 4 different places, each from a different category.";

  return `You are planning an outing in New York City for a college student.

Request:
- What for (may include the vibe they want): ${request.purpose || "anything fun"}
- Time available: ${request.hours} hour${request.hours === 1 ? "" : "s"}
- Budget: ${request.budget} ($ = cheap, $$ = moderate, $$$ = splurge)
- Starting point: ${request.start}

Nearby places (choose only from these, by number):
${list}

${pick} Choose the places that best fit what it's for, the time and the budget, and put them in a sensible walking order.
${
    search
      ? `Use Google Search to look up only the places you pick (one search per place): its Google rating and whether it's still open.
If a pick has closed or is poorly rated, swap it for another place from the same category.`
      : "Set every rating to null."
  }

Reply with only JSON, no other text:
{"title": string (max 8 words), "stops": [{"place": number, "minutes": number, "rating": number or null (Google rating), "note": string (one short sentence: what to do there)}], "tip": string (one short practical tip)}`;
}

// Every model refused: out of free requests for today, or overloaded
export class GeminiBusyError extends Error {}

// Tries each model with Google Search first (real ratings), then each without.
// Refusals come back in well under a second, so falling through is quick.
// Returns the reply, the prompt and model actually used, and the search
// suggestions Google requires us to show alongside answers grounded in Search.
export async function askGemini(promptFor: (search: boolean) => string) {
  const failures: string[] = [];
  for (const search of [true, false]) {
    const prompt = promptFor(search);
    for (const model of MODELS) {
      const res = await fetch(`${GEMINI}/${model.name}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          ...(search && { tools: [{ google_search: {} }] }),
          ...(model.thinkingOff && { generationConfig: { thinkingConfig: { thinkingBudget: 0 } } }),
        }),
      });
      if (!res.ok) {
        failures.push(`${model.name}${search ? " +search" : ""}: ${res.status}`);
        continue;
      }

      const data = await res.json();
      const candidate = data.candidates?.[0];
      const text: string = (candidate?.content?.parts ?? []).map((part: { text?: string }) => part.text ?? "").join("");
      const searchSuggestions: string | null = candidate?.groundingMetadata?.searchEntryPoint?.renderedContent ?? null;
      return { text, searchSuggestions, prompt, model: model.name };
    }
  }
  throw new GeminiBusyError(`All Gemini models refused: ${failures.join(", ")}`);
}

// Pull the JSON out of Gemini's reply (it sometimes wraps it in ```json fences)
// and keep only stops that point at real places from the list.
export function parsePlan(text: string, placeCount: number): GeminiPlan | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    const raw = JSON.parse(text.slice(start, end + 1));
    const stops = (Array.isArray(raw.stops) ? raw.stops : [])
      .filter((stop: { place: unknown }) => {
        const n = stop.place;
        return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= placeCount;
      })
      .map((stop: { place: number; minutes: unknown; rating: unknown; note: unknown }) => ({
        place: stop.place,
        minutes: typeof stop.minutes === "number" ? Math.round(stop.minutes) : 30,
        rating: typeof stop.rating === "number" ? stop.rating : null,
        note: String(stop.note ?? ""),
      }));
    if (stops.length === 0) return null;
    return { title: String(raw.title ?? "Your plan"), stops, tip: String(raw.tip ?? "") };
  } catch {
    return null;
  }
}
