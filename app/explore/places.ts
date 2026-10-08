"use server";

import { createClient } from "@/utils/supabase/server";
import { fetchNearby, type Place } from "./geoapify";
import { CATEGORIES, RADII_MILES, inNyc, type Category } from "./nyc";

export type PlacesResult = { places: Place[] } | { error: string };

// Up to 50 closest places per category, each list sorted by distance
export async function findPlaces(
  lat: number,
  lon: number,
  radiusMiles: number,
  categories: Category[]
): Promise<PlacesResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { error: "Sign in to search." };

  if (!inNyc(lat, lon)) return { error: "Pick a location in NYC." };
  if (!RADII_MILES.includes(radiusMiles as (typeof RADII_MILES)[number])) {
    return { error: "Pick a distance." };
  }
  const picked = [...new Set(categories)].filter((category) => category in CATEGORIES);
  if (picked.length === 0) return { error: "Pick at least one category." };

  try {
    return { places: await fetchNearby(picked, lat, lon, radiusMiles, 50) };
  } catch (err) {
    console.error("findPlaces:", err);
    return { error: "Couldn't load places right now. Try again in a moment." };
  }
}
