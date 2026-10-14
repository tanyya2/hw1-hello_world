import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { PlanContent } from "@/app/explore/plan";
import MemoryMaker from "../MemoryMaker";
import { lastMemoryAt } from "../limit";
import { minutesUntilNext } from "../prompt";

export const metadata: Metadata = { title: "Add a photo" };

// Add a photo to one of your own plans: /captions/new?plan=123
export default async function NewMemory({ searchParams }: PageProps<"/captions/new">) {
  const params = await searchParams;
  const planId = Number.parseInt(String(params.plan ?? ""), 10);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/");

  const { data: plan } = Number.isInteger(planId)
    ? await supabase.from("plans").select("id, content").eq("id", planId).eq("user_id", userId).maybeSingle()
    : { data: null };
  const wait = minutesUntilNext(await lastMemoryAt(supabase, userId));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Add a photo</h1>
        <p className="text-zinc-500">
          {plan
            ? `From your plan “${(JSON.parse(plan.content) as PlanContent).title}”. The AI writes a caption for it.`
            : "You can only add photos to your own plans."}
        </p>
      </header>

      {plan ? (
        <MemoryMaker userId={userId} planId={plan.id} wait={wait} />
      ) : (
        <Link href="/plans?view=mine" className="text-center underline underline-offset-4">
          See my plans
        </Link>
      )}
    </main>
  );
}
