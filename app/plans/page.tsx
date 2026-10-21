import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import PlanTile from "./PlanTile";
import { PLAN_FIELDS, authorOf, parseContent, topPlans, type PlanRow } from "./top";
import { tally } from "./votes";

export const metadata: Metadata = { title: "Plans" };

const PER_PAGE = 12;

const TAB = "rounded-full px-4 py-1.5 text-sm transition";
const TAB_ON = `${TAB} bg-ink text-card`;
const TAB_OFF = `${TAB} text-ink-soft hover:text-ink`;
const PAGER = "rounded-full border border-line-strong px-4 py-1.5 text-sm transition hover:border-ink";
const LABEL = "m-0 text-[13px] uppercase tracking-[0.12em] text-muted";
const GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

// A grid of plans, newest first, 12 per page; each card opens the plan page.
// "Everyone" is public and starts with the all-time top 3 (marked); "My plans" needs login.
export default async function Plans({ searchParams }: PageProps<"/plans">) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  const mine = params.view === "mine" && !!userId;
  const page = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);

  let query = supabase
    .from("plans")
    .select(PLAN_FIELDS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  if (mine) query = query.eq("user_id", userId);
  const [{ data: rows, count }, top] = await Promise.all([query, !mine && page === 1 ? topPlans(3) : []]);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));

  const href = (nextPage: number) => {
    const search = new URLSearchParams();
    if (mine) search.set("view", "mine");
    if (nextPage > 1) search.set("page", String(nextPage));
    const query = search.toString();
    return query ? `/plans?${query}` : "/plans";
  };

  const tile = (row: PlanRow, rank?: number) => {
    const author = authorOf(row);
    const date = new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const meta = [row.neighborhood, !mine && author && `by ${author}`, date].filter(Boolean).join(" · ");
    return (
      <PlanTile
        key={row.id}
        id={row.id}
        plan={parseContent(row)}
        meta={meta}
        votes={tally(row.votes, userId)}
        signedIn={!!userId}
        rank={rank}
      />
    );
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="m-0 font-serif text-4xl font-medium">Plans</h1>
        {userId && (
          <div className="flex gap-1 rounded-full border border-line-strong p-1">
            <Link href="/plans" className={mine ? TAB_OFF : TAB_ON}>
              Everyone
            </Link>
            <Link href="/plans?view=mine" className={mine ? TAB_ON : TAB_OFF}>
              My plans
            </Link>
          </div>
        )}
      </div>

      {top.length > 0 && (
        <section aria-labelledby="top-plans" className="flex flex-col gap-3">
          <h2 id="top-plans" className={LABEL}>
            Top plans
          </h2>
          <div className={GRID}>{top.map(({ row }, i) => tile(row, i + 1))}</div>
        </section>
      )}

      <section aria-label={mine ? "My plans" : "All plans"} className="flex flex-col gap-3">
        {top.length > 0 && <h2 className={LABEL}>Newest</h2>}
        {!rows?.length && (
          <p className="text-muted">
            {mine ? "You haven't made any plans yet. " : "No plans here. "}
            <Link href="/plan" className="underline underline-offset-4 hover:text-ink">
              Make a plan
            </Link>
          </p>
        )}
        <div className={GRID}>{((rows ?? []) as PlanRow[]).map((row) => tile(row))}</div>
      </section>

      {pages > 1 && (
        <nav className="flex items-center justify-between">
          {page > 1 ? <Link href={href(page - 1)} className={PAGER}>← Newer</Link> : <span />}
          <span className="text-sm text-muted">
            Page {Math.min(page, pages)} of {pages}
          </span>
          {page < pages ? <Link href={href(page + 1)} className={PAGER}>Older →</Link> : <span />}
        </nav>
      )}
    </main>
  );
}
