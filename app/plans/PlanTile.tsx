import type { Plan } from "@/app/explore/plan";
import { formatDuration } from "@/app/explore/nyc";

type Props = {
  plan: Plan;
  // e.g. "Hell's Kitchen, Manhattan · by Sam K. · Oct 8"
  meta?: React.ReactNode;
  // Top plans: 1, 2 or 3
  rank?: number;
  // e.g. vote buttons
  children?: React.ReactNode;
};

// Compact plan card for the grid and the top plans: title, stops by name, time and budget
export default function PlanTile({ plan, meta, rank, children }: Props) {
  const minutes = plan.stops.reduce((total, stop) => total + stop.minutes, 0);

  return (
    <article
      className={`flex h-full flex-col gap-3 rounded-2xl border bg-card p-4 text-left ${
        rank ? "border-accent/40" : "border-line"
      }`}
    >
      <header className="flex flex-col gap-1">
        {rank && (
          <span className="self-start rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            #{rank} top plan
          </span>
        )}
        <h2 className="m-0 font-serif text-xl leading-snug font-medium">{plan.title}</h2>
        {meta && <p className="m-0 text-xs text-muted">{meta}</p>}
        <p className="m-0 text-xs text-muted">
          {formatDuration(minutes)}
          {plan.budget && ` · ${plan.budget}`}
        </p>
      </header>

      <ol className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
        {plan.stops.map((stop, i) => (
          <li key={i} className="flex gap-2">
            <span className="w-4 shrink-0 font-serif text-muted">{i + 1}</span>
            <span className="truncate">{stop.name}</span>
          </li>
        ))}
      </ol>

      {children && <div className="mt-auto pt-1">{children}</div>}
    </article>
  );
}
