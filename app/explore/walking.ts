import type { Category } from "./nyc";

type Point = { lat: number; lon: number };

// Straight-line distance in miles
export function milesBetween(a: Point, b: Point) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
}

// Walking time estimate: streets add ~30% to the straight line, at 3 mph (20 min a mile)
export function walkMinutes(a: Point, b: Point) {
  return Math.max(1, Math.round(milesBetween(a, b) * 1.3 * 20));
}

// Night spots come after everything else: no bar before dinner, no club before a museum
const LATE: Category[] = ["bars", "clubs"];

// Every order of a short list (4 stops → 24 orders)
function orders<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, i) =>
    orders([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]),
  );
}

// The order with the shortest walk from `start` through every stop, night spots last.
// `placeOf` gives each stop's location and category.
export function walkingOrder<T>(start: Point, stops: T[], placeOf: (stop: T) => Point & { category: Category }): T[] {
  let best = stops;
  let bestMiles = Infinity;
  for (const order of orders(stops)) {
    const places = order.map(placeOf);
    const firstLate = places.findIndex((place) => LATE.includes(place.category));
    if (firstLate !== -1 && places.slice(firstLate).some((place) => !LATE.includes(place.category))) continue;
    const miles = places.reduce((total, place, i) => total + milesBetween(i === 0 ? start : places[i - 1], place), 0);
    if (miles < bestMiles) {
      best = order;
      bestMiles = miles;
    }
  }
  return best;
}
