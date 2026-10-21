import type { Place } from "./google";
import { CATEGORIES, STOPS, type Category } from "./nyc";

// Server-only: reads the API key.
const GEMINI = "https://generativelanguage.googleapis.com/v1beta/models";

// Free-tier limits are small and per model (e.g. 20 requests/day). When one is
// used up we fall back to the next model. `thinkingOff` skips extended reasoning (much faster);
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
  budget: string;
};

// What Gemini sends back: stops point at places by their number in the list
export type GeminiPlan = {
  title: string;
  stops: { place: number; minutes: number; note: string }[];
  tip: string;
};

// `required`: categories the user picked. Every plan has 3–4 stops (STOPS). Picked
// categories: stops only from them, each at least once; more than 4 picked → the
// best-fitting 4. None picked → mixed if possible.
// Ratings, prices and opening hours come from Google, so Gemini doesn't search.
export function buildPrompt(request: PlanRequest, places: Place[], required: Category[]) {
  // Places grouped under category headings, numbered across the whole list
  const list = (Object.keys(CATEGORIES) as Category[])
    .filter((category) => places.some((place) => place.category === category))
    .map((category) => {
      const lines = places.flatMap((place, i) =>
        place.category === category
          ? [
              [
                `${i + 1}. ${place.name}`,
                place.kind,
                place.rating && `★ ${place.rating}${place.ratingCount ? ` (${place.ratingCount} reviews)` : ""}`,
                place.price && `price ${place.price}`,
                `${place.miles} mi away`,
              ]
                .filter(Boolean)
                .join(" | "),
            ]
          : []
      );
      return `${CATEGORIES[category].label}:\n${lines.join("\n")}`;
    })
    .join("\n\n");

  const labels = required.map((category) => CATEGORIES[category].label);
  const { min, max } = STOPS;
  const count = (low: number) => (low === max ? `exactly ${max}` : `${low} or ${max}`);
  const pick =
    required.length === 0
      ? `Pick ${count(min)} different places, from different categories when you can.`
      : required.length === 1
        ? `Pick ${count(min)} different places, all from ${labels[0]}.`
        : required.length <= max
          ? `Pick ${count(Math.max(min, required.length))} different places, only from ${labels.join(", ")}, with at least one from each of them.`
          : `Pick exactly ${max} different places from ${max} different categories among ${labels.join(", ")}: the ones that fit the request best.`;

  return `You are planning an outing in New York City for a college student.

Request:
- What for (may include the vibe they want): ${request.purpose || "anything fun"}
- Budget: ${request.budget} ($ = cheap, $$ = moderate, $$$ = splurge)
- Starting point: ${request.start}

Nearby places, with their Google rating and price (choose only from these, by number):
${list}

${pick} Choose the places that best fit what it's for and the budget, prefer well-rated ones, and put them in a sensible walking order.

Give each stop a realistic number of minutes for that kind of place and what the person will do there. Typical times: coffee or dessert 20–40, bookstore 20–45, restaurant 45–75, bar 45–90, club 60–120, park 30–60, museum or gallery 60–120.

For each stop, write a note of 1 to 3 short sentences saying specifically what to do there: what to order, see or try, and anything worth knowing. Be concrete and only say things you're confident are true about that place; if you don't know it well, describe what to do there in general terms.

Reply with only JSON, no other text:
{"title": string (max 8 words), "stops": [{"place": number, "minutes": number, "note": string (1–3 sentences: what to do there)}], "tip": string (one short practical tip for the whole outing)}`;
}

// Every model refused: out of free requests for today, or overloaded
export class GeminiBusyError extends Error {}

// Tries each model in turn; refusals (e.g. a model's free daily limit) come back
// in well under a second, so falling through is quick.
// Returns the reply and the model actually used.
export async function askGemini(prompt: string) {
  const failures: string[] = [];
  for (const model of MODELS) {
    const res = await fetch(`${GEMINI}/${model.name}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        ...(model.thinkingOff && { generationConfig: { thinkingConfig: { thinkingBudget: 0 } } }),
      }),
    });
    if (!res.ok) {
      failures.push(`${model.name}: ${res.status}`);
      continue;
    }

    const data = await res.json();
    const text: string = (data.candidates?.[0]?.content?.parts ?? []).map((part: { text?: string }) => part.text ?? "").join("");
    return { text, model: model.name };
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
      .map((stop: { place: number; minutes: unknown; note: unknown }) => ({
        place: stop.place,
        minutes: typeof stop.minutes === "number" ? Math.round(stop.minutes) : 30,
        note: String(stop.note ?? ""),
      }));
    if (stops.length === 0) return null;
    return { title: String(raw.title ?? "Your plan"), stops, tip: String(raw.tip ?? "") };
  } catch {
    return null;
  }
}
