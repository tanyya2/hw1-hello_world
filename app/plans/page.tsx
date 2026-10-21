import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import PlanCard from "@/app/explore/PlanCard";
import VoteButtons from "./VoteButtons";
import { PLAN_FIELDS, authorOf, parseContent, topPlans, type PlanRow } from "./top";
import { tally } from "./votes";

export const metadata: Metadata = { title: "Plans" };

const PER_PAGE = 10;

const TAB = "rounded-full px-4 py-1.5 text-sm transition";
const TAB_ON = `${TAB} bg-ink text-card`;
const TAB_OFF = `${TAB} text-ink-soft hover:text-ink`;
const PAGER = "rounded-full border border-line-strong px-4 py-1.5 text-sm transition hover:border-ink";

// Plans newest first, 10 per page, as a list (default) or a grid.
// "Everyone" is public and starts with the all-time top 3 (same cards, marked); "My plans" needs login.
// Only logged-in users can vote.
export default async function Plans({ searchParams }: PageProps<"/plans">) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  const mine = params.view === "mine" && !!userId;
  const grid = params.layout === "grid";
  const page = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);

  let query = supabase
    .from("plans")
    .select(PLAN_FIELDS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  if (mine) query = query.eq("user_id", userId);
  const [{ data: rows, count }, top] = await Promise.all([query, !mine && page === 1 ? topPlans(3) : []]);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));

  // Keeps the other choices when one changes
  const href = (changes: { view?: "mine" | null; layout?: "grid" | null; page?: number }) => {
    const next = { view: mine ? "mine" : null, layout: grid ? "grid" : null, page: 1, ...changes };
    const search = new URLSearchParams();
    if (next.view) search.set("view", next.view);
    if (next.layout) search.set("layout", next.layout);
    if (next.page > 1) search.set("page", String(next.page));
    const query = search.toString();
    return query ? `/plans?${query}` : "/plans";
  };

  // Same cards either way: one column, or 2 per row (one on phones)
  const layout = grid ? "grid items-start gap-5 md:grid-cols-2" : "flex flex-col gap-6";

  const metaFor = (row: PlanRow, showAuthor: boolean) => {
    const author = authorOf(row);
    const date = new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return [row.neighborhood, showAuthor && author && `by ${author}`, date].filter(Boolean).join(" · ");
  };
  const votesFor = (row: PlanRow) => (
    <VoteButtons planId={row.id} initial={tally(row.votes, userId)} signedIn={!!userId} />
  );

  return (
    <main className={`mx-auto flex w-full flex-col gap-8 px-5 py-10 sm:px-8 ${grid ? "max-w-6xl" : "max-w-3xl"}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="m-0 font-serif text-4xl font-medium">Plans</h1>
        <div className="flex flex-wrap items-center gap-3">
          {userId && (
            <div className="flex gap-1 rounded-full border border-line-strong p-1">
              <Link href={href({ view: null })} className={mine ? TAB_OFF : TAB_ON}>
                Everyone
              </Link>
              <Link href={href({ view: "mine" })} className={mine ? TAB_ON : TAB_OFF}>
                My plans
              </Link>
            </div>
          )}
          <div className="flex gap-1 rounded-full border border-line-strong p-1" aria-label="Layout">
            <Link href={href({ layout: null, page })} className={grid ? TAB_OFF : TAB_ON} aria-label="List" aria-current={!grid}>
              <ListIcon />
            </Link>
            <Link href={href({ layout: "grid", page })} className={grid ? TAB_ON : TAB_OFF} aria-label="Grid" aria-current={grid}>
              <GridIcon />
            </Link>
          </div>
        </div>
      </div>

      {top.length > 0 && (
        <section aria-labelledby="top-plans" className="flex flex-col gap-3">
          <h2 id="top-plans" className="m-0 text-[13px] uppercase tracking-[0.12em] text-muted">
            Top plans
          </h2>
          <div className={layout}>
            {top.map(({ row }, i) => (
              <PlanCard
                key={row.id}
                rank={i + 1}
                plan={{ ...parseContent(row), id: row.id, budget: row.inputs?.budget ?? "" }}
                meta={metaFor(row, true)}
              >
                {votesFor(row)}
              </PlanCard>
            ))}
          </div>
        </section>
      )}

      <section aria-label={mine ? "My plans" : "All plans"} className="flex flex-col gap-3">
        {top.length > 0 && (
          <h2 className="m-0 text-[13px] uppercase tracking-[0.12em] text-muted">
            Newest
          </h2>
        )}

        {!rows?.length && (
          <p className="text-muted">
            {mine ? "You haven't made any plans yet. " : "No plans here. "}
            <Link href="/plan" className="underline underline-offset-4 hover:text-ink">
              Make a plan
            </Link>
          </p>
        )}

        <div className={layout}>
          {((rows ?? []) as PlanRow[]).map((row) => (
            <PlanCard key={row.id} plan={{ ...parseContent(row), id: row.id, budget: row.inputs?.budget ?? "" }} meta={metaFor(row, !mine)}>
              {votesFor(row)}
            </PlanCard>
          ))}
        </div>
      </section>

      {pages > 1 && (
        <nav className="flex items-center justify-between">
          {page > 1 ? <Link href={href({ page: page - 1 })} className={PAGER}>← Newer</Link> : <span />}
          <span className="text-sm text-muted">
            Page {Math.min(page, pages)} of {pages}
          </span>
          {page < pages ? <Link href={href({ page: page + 1 })} className={PAGER}>Older →</Link> : <span />}
        </nav>
      )}
    </main>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
    </svg>
  );
}
