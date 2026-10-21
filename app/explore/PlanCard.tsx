import { CATEGORIES, formatDuration, formatMiles } from "./nyc";
import type { Plan, PlanStop } from "./plan";

type Props = {
  plan: Plan;
  // e.g. "Morningside Heights · by Sam K. · Oct 8"
  meta?: React.ReactNode;
  // Top plans: 1, 2 or 3
  rank?: number;
  // e.g. vote buttons
  children?: React.ReactNode;
};

// Plain links (free, no API): the place on Google Maps, and a Google search for it.
// Saved plans keep only the place id and name, which is enough for both.
function mapsLink(stop: PlanStop) {
  if (stop.mapsUrl) return stop.mapsUrl;
  const params = new URLSearchParams({ api: "1", query: `${stop.name}, New York, NY` });
  if (stop.placeId) params.set("query_place_id", stop.placeId);
  return `https://www.google.com/maps/search/?${params}`;
}

function searchLink(stop: PlanStop) {
  return `https://www.google.com/search?${new URLSearchParams({ q: `${stop.name} ${stop.address ?? "New York, NY"}` })}`;
}

export default function PlanCard({ plan, meta, rank, children }: Props) {
  return (
    <article className={`flex flex-col gap-4 rounded-2xl border bg-card p-5 text-left ${rank ? "border-accent/40" : "border-line"}`}>
      <header className="flex flex-col gap-1">
        {rank && (
          <span className="self-start rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            #{rank} top plan
          </span>
        )}
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-2xl font-medium">{plan.title}</h2>
          <span className="text-sm text-muted">
            {formatDuration(plan.stops.reduce((total, stop) => total + stop.minutes, 0))} · {plan.budget}
          </span>
        </div>
        {meta && <p className="text-xs text-muted">{meta}</p>}
      </header>

      <ol className="flex flex-col gap-4">
        {plan.stops.map((stop, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink font-serif text-sm text-card">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2">
                {stop.mapsUrl ? (
                  <a href={stop.mapsUrl} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-accent hover:underline">
                    {stop.name}
                  </a>
                ) : (
                  <span className="font-medium">{stop.name}</span>
                )}
                {stop.rating && (
                  <span className="text-sm text-muted">
                    ★ {stop.rating}
                    {stop.ratingCount ? ` (${stop.ratingCount.toLocaleString("en-US")})` : ""}
                  </span>
                )}
                {stop.price && <span className="text-sm text-muted">{stop.price}</span>}
              </p>
              <p className="text-sm leading-relaxed">{stop.note}</p>
              <p className="text-xs text-muted">
                {[
                  CATEGORIES[stop.category].label,
                  stop.address,
                  stop.miles !== undefined && formatMiles(stop.miles),
                  `~${stop.minutes} min`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="mt-1 flex gap-4 text-xs">
                <a href={mapsLink(stop)} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  Google Maps ↗
                </a>
                <a href={searchLink(stop)} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  Search on Google ↗
                </a>
              </p>
            </div>
          </li>
        ))}
      </ol>

      {plan.tip && <p className="text-sm text-muted">Tip: {plan.tip}</p>}

      {/* Required by Google when showing answers grounded in Google Search.
          Sandboxed: it's Google's HTML, and links open in a new tab. */}
      {plan.searchSuggestions && (
        <iframe
          title="Google Search suggestions"
          srcDoc={`<base target="_blank">${plan.searchSuggestions}`}
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          className="h-14 w-full border-0"
        />
      )}

      {children}
    </article>
  );
}
