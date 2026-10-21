import type { PlanStop } from "@/app/explore/plan";

// Plain Google links (free, no API key). Saved plans keep only the place id and
// name, which is enough for all of them.
const CITY = "New York, NY";

// The place on Google Maps (rating, reviews, hours, photos)
export function mapsLink(stop: PlanStop) {
  if (stop.mapsUrl) return stop.mapsUrl;
  const params = new URLSearchParams({ api: "1", query: `${stop.name}, ${CITY}` });
  if (stop.placeId) params.set("query_place_id", stop.placeId);
  return `https://www.google.com/maps/search/?${params}`;
}

// A Google search for the place
export function searchLink(stop: PlanStop) {
  return `https://www.google.com/search?${new URLSearchParams({ q: `${stop.name} ${stop.address ?? CITY}` })}`;
}

// Walking directions from wherever you are through every stop in order.
// Google Maps (app or site) then does the turn-by-turn navigation.
export function walkingLink(stops: PlanStop[]) {
  const last = stops[stops.length - 1];
  const middle = stops.slice(0, -1);
  const params = new URLSearchParams({ api: "1", travelmode: "walking", destination: `${last.name}, ${CITY}` });
  if (last.placeId) params.set("destination_place_id", last.placeId);
  if (middle.length > 0) {
    params.set("waypoints", middle.map((stop) => `${stop.name}, ${CITY}`).join("|"));
    if (middle.every((stop) => stop.placeId)) {
      params.set("waypoint_place_ids", middle.map((stop) => stop.placeId).join("|"));
    }
  }
  return `https://www.google.com/maps/dir/?${params}`;
}
