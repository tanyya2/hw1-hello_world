# What's around me — MVP

Find real places near you and get an AI plan built from them. Logged-in users rate plans.

## Flow

1. **Where** — use my location or type a neighborhood. Distance: 1, 2 or 3 miles.
2. **What** — pick categories: Coffee, Restaurants, Bars, Museums, Parks, Bookstores, Dessert.
3. **Places** — closest 10, 20 or 50 places, as a list or a map with numbered pins. User can tick the places they want.
4. **Plan** — logged in only. What for, time, budget, mood → Gemini makes a plan. Uses the ticked places; if none are ticked, Gemini picks the best ones from the closest 20, using Google Search to check ratings and reviews. Saved with its prompt.
5. **Rate** — 👍 / 👎 on plans. Logged in only, one vote per plan.

## Tech

- Neighborhood search: OpenStreetMap Nominatim (free).
- Nearby places: Geoapify Places API (OpenStreetMap data, free plan, 3,000 requests/day, no card). Up to 50 closest per category.
- Map: Leaflet with OpenStreetMap tiles shown in grayscale (free, no key).
- Plans: Gemini `gemini-2.5-flash`.
