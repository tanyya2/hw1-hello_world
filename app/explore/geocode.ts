"use server";

import { createClient } from "@/utils/supabase/server";
import { NYC, inNyc } from "./nyc";

// Place names come from OpenStreetMap's free geocoder (Nominatim).
// Usage policy: identify the app, max 1 request per second.
const NOMINATIM = "https://nominatim.openstreetmap.org";
const HEADERS = {
  "User-Agent": "whats-around-me/1.0 (student project)",
  "Accept-Language": "en",
};

const NYC_VIEWBOX = `${NYC.west},${NYC.north},${NYC.east},${NYC.south}`;

export type Spot = { lat: number; lon: number; label: string };
export type LookupResult = { spot: Spot } | { error: string };

type NominatimAddress = Partial<Record<"neighbourhood" | "quarter" | "suburb", string>>;

// ~100 m precision: enough to find places nearby, not an exact address
function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

// "Morningside Heights, Manhattan" — suburb is the borough in NYC
function labelFor(address: NominatimAddress | undefined, fallback: string) {
  if (!address) return fallback;
  // Some areas only have a district name like "Manhattan Community Board 4" — skip those
  const area = [address.neighbourhood, address.quarter].find((name) => name && !/community board/i.test(name));
  const parts = [area, address.suburb].filter(
    (part, i, all): part is string => !!part && all.indexOf(part) === i
  );
  return parts.join(", ") || fallback;
}

export async function reverseGeocode(lat: number, lon: number): Promise<LookupResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { error: "Sign in to search." };

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { error: "That location doesn't look right." };
  }
  if (!inNyc(lat, lon)) {
    return { error: "Looks like you're outside NYC. Type a NYC neighborhood instead." };
  }

  const spot = { lat: round(lat), lon: round(lon), label: "Your location" };
  try {
    const res = await fetch(
      `${NOMINATIM}/reverse?format=jsonv2&zoom=16&lat=${spot.lat}&lon=${spot.lon}`,
      { headers: HEADERS }
    );
    if (res.ok) {
      const data = await res.json();
      spot.label = labelFor(data.address, spot.label);
    }
  } catch {
    // The name is a nice-to-have; the coordinates are what matter
  }
  return { spot };
}

export async function searchNeighborhood(query: string): Promise<LookupResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { error: "Sign in to search." };

  const q = query.trim();
  if (!q) return { error: "Type a neighborhood or address." };
  if (q.length > 100) return { error: "That's a bit long — try just the neighborhood." };

  try {
    const params = new URLSearchParams({
      q,
      format: "jsonv2",
      addressdetails: "1",
      limit: "1",
      viewbox: NYC_VIEWBOX,
      bounded: "1",
    });
    const res = await fetch(`${NOMINATIM}/search?${params}`, { headers: HEADERS });
    if (!res.ok) return { error: "Couldn't search right now. Try again in a moment." };

    const [match] = await res.json();
    if (!match) return { error: `Couldn't find "${q}" in NYC.` };

    return {
      spot: {
        lat: round(Number(match.lat)),
        lon: round(Number(match.lon)),
        label: labelFor(match.address, q),
      },
    };
  } catch {
    return { error: "Couldn't search right now. Try again in a moment." };
  }
}
