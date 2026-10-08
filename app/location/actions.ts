"use server";

// Place names come from OpenStreetMap's free geocoder (Nominatim).
// Usage policy: identify the app, max 1 request per second.
const NOMINATIM = "https://nominatim.openstreetmap.org";
const HEADERS = {
  "User-Agent": "whats-around-me/1.0 (student project)",
  "Accept-Language": "en",
};

// The app covers NYC only
const NYC = { west: -74.26, north: 40.92, east: -73.7, south: 40.49 };
const NYC_VIEWBOX = `${NYC.west},${NYC.north},${NYC.east},${NYC.south}`;

export type Spot = { lat: number; lon: number; label: string };
export type LookupResult = { spot: Spot } | { error: string };

type NominatimAddress = Partial<Record<"neighbourhood" | "quarter" | "suburb", string>>;

// ~100 m precision: enough to find places nearby, not an exact address
function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

function inNyc(lat: number, lon: number) {
  return lat >= NYC.south && lat <= NYC.north && lon >= NYC.west && lon <= NYC.east;
}

// "Morningside Heights, Manhattan" — suburb is the borough in NYC
function labelFor(address: NominatimAddress | undefined, fallback: string) {
  if (!address) return fallback;
  const parts = [address.neighbourhood ?? address.quarter, address.suburb].filter(
    (part, i, all): part is string => !!part && all.indexOf(part) === i
  );
  return parts.join(", ") || fallback;
}

export async function reverseGeocode(lat: number, lon: number): Promise<LookupResult> {
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
