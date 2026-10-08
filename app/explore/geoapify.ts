import { CATEGORIES, type Category } from "./nyc";

// Geoapify returns the closest places first (OpenStreetMap data, free plan).
// Server-only: reads the API key.
const GEOAPIFY = "https://api.geoapify.com/v2/places";
export const METERS_PER_MILE = 1609.34;

export type Place = {
  id: string;
  name: string;
  category: Category;
  lat: number;
  lon: number;
  miles: number;
  address: string | null;
  cuisine: string | null;
  hours: string | null;
};

type Feature = {
  properties: {
    place_id: string;
    name?: string;
    lat: number;
    lon: number;
    distance: number;
    housenumber?: string;
    street?: string;
    opening_hours?: string;
    datasource?: { raw?: { cuisine?: string } };
  };
};

async function fetchCategory(category: Category, lat: number, lon: number, meters: number, limit: number) {
  const params = new URLSearchParams({
    categories: CATEGORIES[category].geoapify,
    filter: `circle:${lon},${lat},${meters}`,
    bias: `proximity:${lon},${lat}`,
    limit: String(limit),
    apiKey: process.env.GEOAPIFY_API_KEY!,
  });
  const res = await fetch(`${GEOAPIFY}?${params}`);
  if (!res.ok) throw new Error(`Geoapify ${res.status}`);
  const data: { features: Feature[] } = await res.json();

  return data.features
    .filter((feature) => feature.properties.name)
    .map(({ properties: p }): Place => ({
      id: p.place_id,
      name: p.name!,
      category,
      lat: p.lat,
      lon: p.lon,
      miles: Math.round((p.distance / METERS_PER_MILE) * 10) / 10,
      address: p.housenumber && p.street ? `${p.housenumber} ${p.street}` : p.street ?? null,
      // "coffee_shop;italian" → "coffee shop, italian"
      cuisine: p.datasource?.raw?.cuisine?.replaceAll("_", " ").replaceAll(";", ", ") ?? null,
      hours: p.opening_hours ?? null,
    }));
}

// Closest `perCategory` places for each category, each list sorted by distance
export async function fetchNearby(
  categories: Category[],
  lat: number,
  lon: number,
  radiusMiles: number,
  perCategory: number
) {
  const meters = Math.round(radiusMiles * METERS_PER_MILE);
  const lists = await Promise.all(
    categories.map((category) => fetchCategory(category, lat, lon, meters, perCategory))
  );

  // A place can match two categories (e.g. a café that's also a bakery) — keep it once
  const seen = new Set<string>();
  return lists.flat().filter((place) => {
    if (seen.has(place.id)) return false;
    seen.add(place.id);
    return true;
  });
}
