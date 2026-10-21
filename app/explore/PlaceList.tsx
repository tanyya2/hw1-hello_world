import type { Place } from "./google";
import { CATEGORIES, formatMiles } from "./nyc";

export default function PlaceList({ places }: { places: Place[] }) {
  return (
    <div className="flex flex-col gap-2">
      <ol className="divide-y divide-line rounded-2xl border border-line bg-card text-left">
        {places.map((place, i) => (
          <li key={place.id} className="flex items-start gap-3 px-4 py-3">
            <span className="w-5 shrink-0 pt-0.5 text-xs text-muted">{i + 1}</span>
            <span className="min-w-0 flex-1">
              {place.mapsUrl ? (
                <a
                  href={place.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate font-medium hover:text-accent hover:underline"
                >
                  {place.name}
                </a>
              ) : (
                <span className="block truncate font-medium">{place.name}</span>
              )}
              <span className="block truncate text-sm text-muted">
                {[
                  place.kind ?? CATEGORIES[place.category].label,
                  place.rating && `★ ${place.rating}${place.ratingCount ? ` (${place.ratingCount.toLocaleString("en-US")})` : ""}`,
                  place.address,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span className="shrink-0 pt-0.5 text-sm text-muted">{formatMiles(place.miles)}</span>
          </li>
        ))}
      </ol>
      {/* Google requires credit wherever its place data is shown without a Google map */}
      <p className="text-right text-xs text-muted">Place data from Google Maps</p>
    </div>
  );
}
