import { CATEGORIES } from "./nyc";
import type { Plan } from "./plan";

export default function PlanCard({ plan }: { plan: Plan }) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-5 text-left dark:border-zinc-800">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{plan.title}</h2>
        <span className="text-sm text-zinc-500">
          {plan.hours}h · {plan.budget}
        </span>
      </header>

      <ol className="flex flex-col gap-4">
        {plan.stops.map((stop, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-xs font-semibold text-white dark:bg-white dark:text-black">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{stop.name}</span>
                {stop.rating && <span className="text-sm text-zinc-500">★ {stop.rating}</span>}
              </p>
              <p className="text-sm">{stop.note}</p>
              <p className="text-xs text-zinc-500">
                {[CATEGORIES[stop.category].label, stop.address, `${stop.miles} mi`, `~${stop.minutes} min`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {plan.tip && <p className="text-sm text-zinc-500">Tip: {plan.tip}</p>}

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
    </article>
  );
}
