import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { CATEGORIES, formatDuration, formatMiles } from "@/app/explore/nyc";
import VoteButtons from "../VoteButtons";
import { PLAN_FIELDS, authorOf, parseContent, type PlanRow } from "../top";
import { tally } from "../votes";
import { mapsLink, searchLink, walkingLink } from "../links";
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
  const author = authorOf(row);
  const date = new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const facts = [
    { label: "Time", value: formatDuration(minutes) },
    { label: "Stops", value: String(plan.stops.length) },
    { label: "Budget", value: row.inputs?.budget || "—" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-5 py-10 sm:px-8">
      <Link href="/plans" className="self-start text-sm text-muted hover:text-ink">
        ← All plans
      </Link>

      <header className="flex flex-col gap-3">
        <p className="m-0 text-[13px] uppercase tracking-[0.12em] text-muted">
          {[row.neighborhood, author && `by ${author}`, date].filter(Boolean).join(" · ")}
        </p>
        <h1 className="m-0 font-serif text-4xl leading-tight font-medium sm:text-5xl">{plan.title}</h1>
        <dl className="m-0 mt-2 grid grid-cols-3 border-y border-line">
          {facts.map((fact, i) => (
            <div key={fact.label} className={`py-3 ${i > 0 ? "border-l border-line pl-4" : ""}`}>
              <dt className="text-xs text-muted">{fact.label}</dt>
              <dd className="m-0 font-serif text-2xl">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <a
          href={walkingLink(plan.stops)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 items-center rounded-full bg-accent px-5 text-sm font-semibold text-white transition hover:bg-[#174634]"
        >
          Start walking ↗
        </a>
        <CopyLink />
        <div className="ml-auto">
          <VoteButtons planId={row.id} initial={tally(row.votes, userId)} signedIn={!!userId} />
        </div>
      </div>

      <ol className="m-0 flex list-none flex-col p-0">
        {plan.stops.map((stop, i) => (
          <li key={i} className="flex gap-4 border-t border-line py-6 last:border-b">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink font-serif text-lg text-card">
              {i + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 className="m-0 font-serif text-2xl leading-snug font-medium">{stop.name}</h2>
                <span className="text-sm text-muted">~{stop.minutes} min</span>
              </div>
              <p className="m-0 text-sm text-muted">
                {[
                  // (No stored ratings: old plans have ones Gemini guessed; real ones come from Google)
                  CATEGORIES[stop.category]?.label,
                  stop.address,
                  stop.miles !== undefined && formatMiles(stop.miles),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="m-0 leading-relaxed">{stop.note}</p>
              <p className="m-0 flex gap-4 text-sm">
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

      {plan.tip && (
        <p className="m-0 rounded-2xl border border-line bg-card p-4 text-sm leading-relaxed">
          <strong className="font-medium">Tip:</strong> {plan.tip}
        </p>
      )}

    </main>
  );
}
