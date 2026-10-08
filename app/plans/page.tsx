import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import PlanCard from "@/app/explore/PlanCard";
import type { PlanContent } from "@/app/explore/plan";
import VoteButtons from "./VoteButtons";
import { tally } from "./votes";

export const metadata: Metadata = { title: "Plans" };

// Everyone's plans, newest first. Anyone can read; only logged-in users can vote.
export default async function Plans() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  const { data: rows } = await supabase
    .from("plans")
    .select("id, created_at, neighborhood, inputs, content, profiles(first_name, last_name), votes(user_id, value)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12">
      <h1 className="text-center text-3xl font-semibold tracking-tight">Plans</h1>

      {!rows?.length && (
        <p className="text-center text-zinc-500">
          No plans yet.{" "}
          <Link href="/" className="underline underline-offset-4 hover:text-black dark:hover:text-white">
            Make the first one
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
            meta={[row.neighborhood, author && `by ${author}`, date].filter(Boolean).join(" · ")}
          >
            <VoteButtons planId={row.id} initial={tally(row.votes, userId)} signedIn={!!userId} />
          </PlanCard>
        );
      })}
    </main>
  );
}
