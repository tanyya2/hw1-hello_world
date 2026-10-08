# What's around me — MVP

Find real places near you and get an AI plan built from them. Logged-in users rate plans.

## Flow

1. **Where** — use my location or type a neighborhood. Distance: 1, 2 or 5 miles.
2. **What** — pick categories: Coffee, Restaurants, Bars, Museums, Parks, Bookstores, Dessert.
3. **Places** — list of nearby places from OpenStreetMap: name, category, distance. User can tick the places they want.
4. **Plan** — logged in only. What for, time, budget, mood → Gemini makes a plan. Uses the ticked places; if none are ticked, Gemini picks the best ones from the list, using Google Search to check ratings and reviews. Saved with its prompt.
5. **Rate** — 👍 / 👎 on plans. Logged in only, one vote per plan.

## Tech

- Neighborhood search + nearby places: OpenStreetMap (Nominatim + Overpass). Closest ~20 places per category.
- Plans: Gemini `gemini-2.5-flash`.
