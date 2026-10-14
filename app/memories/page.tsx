import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { PlanContent } from "@/app/explore/plan";
import MemoryCard from "./MemoryCard";

export const metadata: Metadata = { title: "Memories" };

const PER_PAGE = 10;

const TAB = "rounded-full px-5 py-1.5 text-sm font-medium transition";
const TAB_ON = `${TAB} bg-black text-white dark:bg-white dark:text-black`;
const TAB_OFF = `${TAB} text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white`;
const PAGER = "rounded-full border border-zinc-300 px-4 py-1.5 text-sm transition hover:border-black dark:border-zinc-700 dark:hover:border-white";

// Photos from plans with their AI captions, newest first, 10 per page.
// "Everyone" is public, even logged out; "My memories" needs login.
export default async function Memories({ searchParams }: PageProps<"/memories">) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  const mine = params.view === "mine" && !!userId;
  const page = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);

  let query = supabase
    .from("memories")
    // The author's profile (not the voters', which memory_votes also links to)
    .select(
      "id, created_at, photo_url, caption, plans(neighborhood, content), profiles!memories_user_id_fkey(first_name, last_name)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  if (mine) query = query.eq("user_id", userId);
  const { data: rows, count, error } = await query;
  if (error) console.error("memories:", error);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));

  const href = (nextPage: number) => {
    const search = new URLSearchParams();
    if (mine) search.set("view", "mine");
    if (nextPage > 1) search.set("page", String(nextPage));
    const query = search.toString();
    return query ? `/memories?${query}` : "/memories";
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12">
      <h1 className="text-center text-3xl font-semibold tracking-tight">Memories</h1>

      {userId && (
        <div className="flex justify-center">
          <div className="flex gap-1 rounded-full border border-zinc-300 p-1 dark:border-zinc-700">
            <Link href="/memories" className={mine ? TAB_OFF : TAB_ON}>
              Everyone
            </Link>
            <Link href="/memories?view=mine" className={mine ? TAB_ON : TAB_OFF}>
              My memories
            </Link>
          </div>
        </div>
      )}

      {!rows?.length && (
        <p className="text-center text-zinc-500">
          {mine ? "You haven't added any photos yet. " : "No memories here yet. "}
          {userId && (
            <Link href="/plans?view=mine" className="underline underline-offset-4 hover:text-black dark:hover:text-white">
              Add a photo to one of your plans
            </Link>
          )}
        </p>
      )}

      {rows?.map((row) => {
        // One plan and one author per memory; the untyped client types the joins as lists
        const plan = [row.plans].flat()[0];
        const profile = [row.profiles].flat()[0];
        const title = plan ? (JSON.parse(plan.content) as PlanContent).title : null;
        const author = profile ? `${profile.first_name ?? ""} ${profile.last_name?.[0] ?? ""}`.trim() : null;
        const date = new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });

        return (
          <MemoryCard
            key={row.id}
            photoUrl={row.photo_url}
            caption={row.caption}
            meta={[title, plan?.neighborhood, !mine && author && `by ${author}`, date].filter(Boolean).join(" · ")}
          />
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
