import { CATEGORIES, formatMiles } from "./nyc";
import type { Plan } from "./plan";

type Props = {
  plan: Plan;
  // e.g. "Morningside Heights · by Sam K. · Oct 8"
  meta?: React.ReactNode;
  // e.g. vote buttons
  children?: React.ReactNode;
};

export default function PlanCard({ plan, meta, children }: Props) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-5 text-left">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-2xl font-medium">{plan.title}</h2>
          <span className="text-sm text-muted">
            {plan.hours}h · {plan.budget}
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
                <span className="font-medium">{stop.name}</span>
                {stop.rating && <span className="text-sm text-muted">★ {stop.rating}</span>}
              </p>
              <p className="text-sm">{stop.note}</p>
              <p className="text-xs text-muted">
                {[CATEGORIES[stop.category].label, stop.address, formatMiles(stop.miles), `~${stop.minutes} min`]
                  .filter(Boolean)
                  .join(" · ")}
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
