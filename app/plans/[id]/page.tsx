import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { CATEGORIES, formatDuration, formatMiles } from "@/app/explore/nyc";
import VoteButtons from "../VoteButtons";
import { PLAN_FIELDS, authorOf, parseContent, type PlanRow } from "../top";
import { tally } from "../votes";
import { mapsLink, searchLink, walkingLink } from "../links";
import { ArrowBadge, BUTTON } from "@/app/components/buttons";
import CopyLink from "./CopyLink";

async function loadPlan(id: string) {
  if (!/^\d+$/.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("plans").select(PLAN_FIELDS).eq("id", Number(id)).maybeSingle();
  return data as PlanRow | null;
}

export async function generateMetadata({ params }: PageProps<"/plans/[id]">): Promise<Metadata> {
  const row = await loadPlan((await params).id);
  return { title: row ? parseContent(row).title : "Plan not found" };
}

// One plan with everything: what to do at each stop, links, walking directions, votes.
// Public: anyone with the link can see it; voting needs sign-in.
export default async function PlanPage({ params }: PageProps<"/plans/[id]">) {
  const row = await loadPlan((await params).id);
  if (!row) notFound();

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  const plan = parseContent(row);
  const minutes = plan.stops.reduce((total, stop) => total + stop.minutes, 0);
  // Walks between stops (older plans don't have them)
  const walking = plan.stops.reduce((total, stop) => total + (stop.walkMinutes ?? 0), 0);
  // Start walking begins at the user's own location; a neighborhood isn't a real spot,
  // so then Google starts from wherever you are (or lets you type one)
  const { lat, lon, myLocation } = row.inputs ?? {};
  const start = myLocation && lat !== undefined && lon !== undefined ? { lat, lon } : undefined;
  const credited = plan.stops.some((stop) => stop.placeId);
  const author = authorOf(row);
  const date = new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const facts = [
    { label: "Time", value: formatDuration(minutes + walking), note: walking > 0 ? `incl. ${walking} min walking` : null },
    { label: "Stops", value: String(plan.stops.length) },
    { label: "Budget", value: row.inputs?.budget || "—" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-7 px-5 pt-4 pb-10 sm:px-8">
      <Link href="/plans" className="-mb-3 self-start text-sm text-muted hover:text-ink">
        ← All plans
      </Link>

      <header className="flex flex-col gap-3">
        <p className="m-0 text-xs uppercase tracking-[0.14em] text-muted">
          {[row.neighborhood, author && `by ${author}`, date].filter(Boolean).join(" · ")}
        </p>
        <h1 className="m-0 font-serif text-[36px] leading-[1.08] font-medium tracking-[-0.01em] sm:text-[40px]">{plan.title}</h1>
        <dl className="m-0 mt-2 grid grid-cols-3 border-y border-line">
          {facts.map((fact, i) => (
            <div key={fact.label} className={`flex flex-col gap-0.5 py-3 ${i > 0 ? "border-l border-line pl-5" : ""}`}>
              <dt className="text-xs text-muted">{fact.label}</dt>
              <dd className="m-0 font-serif text-xl">{fact.value}</dd>
              {"note" in fact && fact.note && <dd className="m-0 text-xs text-muted">{fact.note}</dd>}
            </div>
          ))}
        </dl>
      </header>

      <div className="flex flex-wrap items-center gap-5">
        <a href={walkingLink(plan.stops, start)} target="_blank" rel="noopener noreferrer" className={BUTTON.primarySmall}>
          Start walking
          <ArrowBadge small />
        </a>
        <CopyLink />
        <div className="ml-auto">
          <VoteButtons planId={row.id} initial={tally(row.votes, userId)} signedIn={!!userId} />
        </div>
      </div>

      {/* The stops as a walk: small numbered pins joined by a dotted line */}
      <ol className="m-0 mt-2 flex list-none flex-col p-0">
        {plan.stops.map((stop, i) => (
          <li
            key={i}
            className="relative flex gap-4 pb-8 before:absolute before:top-9 before:bottom-1.5 before:left-[12.5px] before:w-[3px] before:bg-[radial-gradient(circle,var(--color-accent)_1.5px,transparent_1.8px)] before:bg-[length:3px_9px] before:bg-repeat-y before:content-[''] last:pb-0 last:before:hidden"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent font-serif text-[15px] text-white shadow-[0_0_0_3px_var(--color-paper),0_0_0_4px_rgb(30_90_67/0.25)]">
              {i + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 className="m-0 font-serif text-[22px] leading-snug font-medium">{stop.name}</h2>
                <span className="text-[13px] text-muted">~{stop.minutes} min</span>
              </div>
              <p className="m-0 text-[13px] text-muted">
                {[
                  // (No stored ratings: old plans have ones Gemini guessed; real ones come from Google)
                  CATEGORIES[stop.category]?.label,
                  stop.address,
                  stop.miles !== undefined && formatMiles(stop.miles),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="m-0 mt-1 text-[15px] leading-relaxed">{stop.note}</p>
              <p className="m-0 mt-0.5 flex gap-4 text-xs text-muted">
                <a href={mapsLink(stop)} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                  Google Maps ↗
                </a>
                <a href={searchLink(stop)} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                  Search on Google ↗
                </a>
              </p>
              {/* The walk to the next stop, on the dotted line */}
              {plan.stops[i + 1]?.walkMinutes !== undefined && (
                <p className="m-0 mt-4 text-xs text-accent">{plan.stops[i + 1].walkMinutes} min walk</p>
              )}
            </div>
          </li>
        ))}
      </ol>
      {/* Google's terms: credit Google Maps next to its place data (plans from before the Google switch have none).
          The tip's dashed line sits right under the credit. */}
      {(credited || plan.tip) && (
        <div className={`flex flex-col gap-1.5 ${credited ? "-mt-4" : ""}`}>
          {credited && <p className="m-0 text-right text-xs text-muted/70">Google Maps</p>}
          {plan.tip && (
            <p className="m-0 border-t border-dashed border-line pt-4 text-[15px] leading-relaxed text-ink-soft">
              <strong className="font-semibold text-ink">Tip:</strong> {plan.tip}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
