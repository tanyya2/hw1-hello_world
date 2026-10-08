# What's around me — MVP

Find real places near you and get an AI plan built from them. Logged-in users rate plans.

## Flow

Logged in only. Shared: **Where** — use my location or type a neighborhood; distance 1, 2 or 3 miles. Then pick a mode:

1. **Find places** — pick categories (Coffee, Restaurants, Bars, Museums, Parks, Bookstores, Dessert). See the closest 10, 20 or 50 as a list or a map with numbered pins.
2. **Make a plan** — what for (including the vibe), time (1–3h), budget ($–$$$), optional categories. The server gets up to 30 nearby places; Gemini picks at least 3 different places: 3 from the picked categories if 1–2 are picked, one per category if 3+, or 3–4 from different categories if none, checks Google ratings with Search, and writes the plan. Saved to `plans` with its prompt.
3. **Rate** — 👍 / 👎 on plans, one vote per user per plan; voting the same way again removes it. On the new plan and on `/plans`, a public feed of everyone's plans (newest first). Logged-out visitors can read but not vote.

## Tech

- Neighborhood search: OpenStreetMap Nominatim (free).
- Nearby places: Geoapify Places API (OpenStreetMap data, free plan, 3,000 requests/day, no card). Up to 50 closest per category.
- Map: Leaflet with OpenStreetMap tiles shown in grayscale (free, no key).
- Plans: Gemini `gemini-2.5-flash` with Google Search grounding, thinking off (~3–4 s). Free tier is ~20 requests/day per model, so it falls back to other Gemini models, then to no Search (no ratings). Each plan saves the model and prompt actually used. Google's search suggestions are shown under each plan, as required.
