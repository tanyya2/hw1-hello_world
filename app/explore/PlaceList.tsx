import type { Place } from "./geoapify";
import { CATEGORIES, formatMiles } from "./nyc";

export default function PlaceList({ places }: { places: Place[] }) {
  return (
    <ol className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 text-left dark:divide-zinc-800 dark:border-zinc-800">
      {places.map((place, i) => (
        <li key={place.id} className="flex items-start gap-3 px-4 py-3">
          <span className="w-5 shrink-0 pt-0.5 text-xs text-zinc-400">{i + 1}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{place.name}</span>
            <span className="block truncate text-sm text-zinc-500">
              {[CATEGORIES[place.category].label, place.cuisine, place.address].filter(Boolean).join(" · ")}
            </span>
          </span>
          <span className="shrink-0 pt-0.5 text-sm text-zinc-500">{formatMiles(place.miles)}</span>
        </li>
      ))}
    </ol>
  );
}
