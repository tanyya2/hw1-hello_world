import Link from "next/link";
import type { PlanContent } from "@/app/explore/plan";

type Props = {
  id: number;
  plan: PlanContent;
  // e.g. "Hell's Kitchen, Manhattan · by Sam K. · Oct 8"
  meta: string;
  up: number;
  // Top plans: 1, 2 or 3
  rank?: number;
};

// Compact card for the plans grid: name and places. The whole card opens the plan page.
export default function PlanTile({ id, plan, meta, up, rank }: Props) {
  return (
    <Link
      href={`/plans/${id}`}
      className={`flex h-full flex-col gap-3 rounded-2xl border bg-card p-4 transition hover:border-ink ${
        rank ? "border-accent/40" : "border-line"
      }`}
    >
      <div className="flex flex-col gap-1">
        {rank && (
          <span className="self-start rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            #{rank} top plan
          </span>
        )}
        <h2 className="m-0 font-serif text-xl leading-snug font-medium">{plan.title}</h2>
        <p className="m-0 text-xs text-muted">{meta}</p>
      </div>

      <ol className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
        {plan.stops.map((stop, i) => (
          <li key={i} className="flex gap-2">
            <span className="w-4 shrink-0 font-serif text-muted">{i + 1}</span>
            <span className="truncate">{stop.name}</span>
          </li>
        ))}
      </ol>

      <p className="m-0 mt-auto pt-1 text-sm text-muted">
        <span aria-label={`${up} likes`}>▲ {up}</span>
      </p>
    </Link>
  );
}
