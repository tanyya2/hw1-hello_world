import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import PlanCard from "@/app/explore/PlanCard";
import type { PlanContent } from "@/app/explore/plan";
import VoteButtons from "./VoteButtons";
import { tally } from "./votes";

export const metadata: Metadata = { title: "Plans" };

const PER_PAGE = 10;

const TAB = "rounded-full px-5 py-1.5 text-sm font-medium transition";
const TAB_ON = `${TAB} bg-black text-white dark:bg-white dark:text-black`;
const TAB_OFF = `${TAB} text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white`;
const PAGER = "rounded-full border border-zinc-300 px-4 py-1.5 text-sm transition hover:border-black dark:border-zinc-700 dark:hover:border-white";

// Plans newest first, 10 per page. "Everyone" is public; "My plans" needs login.
// Only logged-in users can vote.
export default async function Plans({ searchParams }: PageProps<"/plans">) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  const mine = params.view === "mine" && !!userId;
  const page = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);

  let query = supabase
    .from("plans")
    .select(
      "id, created_at, neighborhood, inputs, content, profiles(first_name, last_name), votes(user_id, value)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  if (mine) query = query.eq("user_id", userId);
  const { data: rows, count } = await query;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));

  const href = (nextPage: number) => {
    const search = new URLSearchParams();
    if (mine) search.set("view", "mine");
    if (nextPage > 1) search.set("page", String(nextPage));
    const query = search.toString();
    return query ? `/plans?${query}` : "/plans";
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12">
      <h1 className="text-center text-3xl font-semibold tracking-tight">Plans</h1>

      {userId && (
        <div className="flex justify-center">
          <div className="flex gap-1 rounded-full border border-zinc-300 p-1 dark:border-zinc-700">
            <Link href="/plans" className={mine ? TAB_OFF : TAB_ON}>
              Everyone
            </Link>
            <Link href="/plans?view=mine" className={mine ? TAB_ON : TAB_OFF}>
              My plans
            </Link>
          </div>
        </div>
      )}

      {!rows?.length && (
        <p className="text-center text-zinc-500">
          {mine ? "You haven't made any plans yet. " : "No plans here. "}
          <Link href="/" className="underline underline-offset-4 hover:text-black dark:hover:text-white">
            Make a plan
          </Link>
        </p>
      )}

      {rows?.map((row) => {
        const content: PlanContent = JSON.parse(row.content);
        // One author per plan; the untyped client types the join as a list
        const profile = [row.profiles].flat()[0];
        const author = profile ? `${profile.first_name ?? ""} ${profile.last_name?.[0] ?? ""}`.trim() : null;
        const date = new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });

        return (
          <PlanCard
            key={row.id}
            plan={{ ...content, id: row.id, hours: row.inputs?.hours, budget: row.inputs?.budget }}
            meta={[row.neighborhood, !mine && author && `by ${author}`, date].filter(Boolean).join(" · ")}
          >
            <VoteButtons planId={row.id} initial={tally(row.votes, userId)} signedIn={!!userId} />
          </PlanCard>
        );
      })}

      {pages > 1 && (
        <nav className="flex items-center justify-between">
          {page > 1 ? <Link href={href(page - 1)} className={PAGER}>← Newer</Link> : <span />}
          <span className="text-sm text-zinc-500">
            Page {Math.min(page, pages)} of {pages}
          </span>
          {page < pages ? <Link href={href(page + 1)} className={PAGER}>Older →</Link> : <span />}
        </nav>
      )}
    </main>
  );
}
