import Link from "next/link";
import type { PlanContent } from "@/app/explore/plan";
import VoteButtons from "./VoteButtons";
import type { Tally } from "./votes";

type Props = {
  id: number;
  plan: PlanContent;
  // e.g. "Hell's Kitchen, Manhattan · by Sam K. · Oct 8"
  meta: string;
  votes: Tally;
  signedIn: boolean;
  // Top plans: 1, 2 or 3
  rank?: number;
};

// Compact card for the plans grid: name, places and votes. Clicking anywhere
// but the vote buttons opens the plan page (the title link covers the card).
export default function PlanTile({ id, plan, meta, votes, signedIn, rank }: Props) {
  return (
    <article
      className={`relative flex h-full flex-col gap-3 rounded-2xl border bg-card p-4 transition hover:border-ink ${
        rank ? "border-accent/40" : "border-line"
      }`}
    >
      <div className="flex flex-col gap-1">
        {rank && (
          <span className="self-start rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            #{rank} top plan
          </span>
        )}
        <h2 className="m-0 font-serif text-xl leading-snug font-medium">
          <Link href={`/plans/${id}`} className="after:absolute after:inset-0 after:rounded-2xl">
            {plan.title}
          </Link>
        </h2>
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

      {/* Above the card-wide link, so the buttons get the clicks */}
      <div className="relative z-10 mt-auto pt-1">
        <VoteButtons planId={id} initial={votes} signedIn={signedIn} />
      </div>
    </article>
  );
}
