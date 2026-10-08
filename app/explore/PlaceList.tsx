import { CATEGORIES } from "./nyc";
import type { Place } from "./places";

type Props = {
  places: Place[];
  selected: Set<string>;
  onToggle: (id: string) => void;
};

export default function PlaceList({ places, selected, onToggle }: Props) {
  return (
    <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 text-left dark:divide-zinc-800 dark:border-zinc-800">
      {places.map((place, i) => (
        <li key={place.id}>
          <label className="flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-900">
            <input
              type="checkbox"
              checked={selected.has(place.id)}
              onChange={() => onToggle(place.id)}
              className="mt-1 h-4 w-4 accent-black dark:accent-white"
            />
            <span className="w-5 shrink-0 pt-0.5 text-xs text-zinc-400">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{place.name}</span>
              <span className="block truncate text-sm text-zinc-500">
                {[CATEGORIES[place.category].label, place.cuisine, place.address].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span className="shrink-0 pt-0.5 text-sm text-zinc-500">{place.miles} mi</span>
          </label>
        </li>
      ))}
    </ul>
  );
}
