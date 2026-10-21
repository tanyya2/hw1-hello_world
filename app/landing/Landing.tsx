import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { PlanContent } from "@/app/explore/plan";
import SignInButton from "@/app/components/SignInButton";
import { parseContent, topPlans } from "@/app/plans/top";

const STEPS = [
  { title: "Where", text: "Use your location or pick a neighborhood, like Williamsburg or the West Village." },
  { title: "Your mood", text: "Quick lunch? Cheap date? Say no more, we’ve got you." },
  { title: "Your plan", text: "3–4 stops that are open, in an order you can walk, and what it will cost." },
];

// The signed-in user's 3 latest plans
async function myPlans(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select("id, neighborhood, created_at, content")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(3);
  return (data ?? []).map((row) => ({
    id: row.id,
    title: (JSON.parse(row.content) as PlanContent).title,
    neighborhood: row.neighborhood,
    date: new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));
}

const BUTTON = "min-h-14 rounded-full px-7 py-4 text-base";

// Home for everyone. Making a plan needs sign-in; looking around doesn't.
export default async function Landing({ userId }: { userId: string | null }) {
  const [best, mine] = await Promise.all([topPlans(3), userId ? myPlans(userId) : []]);
  const top = best.map(({ row, score }) => ({ id: row.id, title: parseContent(row).title, neighborhood: row.neighborhood, score }));

  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-[1440px] px-5 pt-14 pb-16 sm:px-8 lg:px-12 sm:pt-[72px]">
        <div className="flex max-w-3xl flex-col gap-6">
          <h1 className="m-0 font-serif text-5xl leading-[1.02] font-medium tracking-[-0.02em] sm:text-[64px]">
            Your next few hours in New York planned for you
          </h1>
          <p className="m-0 max-w-[480px] text-[19px] leading-relaxed text-ink-soft">
            Real places near you, in an order you can walk, with the route and what it will cost.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {userId ? (
              <Link href="/plan" className={`${BUTTON} bg-accent font-semibold text-white hover:bg-[#174634]`}>
                Make my plan
              </Link>
            ) : (
              <SignInButton variant="primary" next="/plan">
                Make my plan
              </SignInButton>
            )}
            <Link href="/plans" className={`${BUTTON} border border-ink font-medium hover:bg-card`}>
              Browse plans
            </Link>
          </div>
        </div>
      </section>

      {mine.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-5 pb-14 sm:px-8 lg:px-12">
          <div className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="m-0 font-serif text-2xl font-medium">Your plans</h2>
              <Link href="/plans?view=mine" className="text-sm hover:text-accent">
                See all →
              </Link>
            </div>
            <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
              {mine.map((plan) => (
                <li key={plan.id}>
                  <Link
                    href={`/plans/${plan.id}`}
                    className="flex h-full flex-col gap-1 rounded-xl border border-line bg-paper p-4 transition hover:border-ink"
                  >
                    <span className="font-medium">{plan.title}</span>
                    <span className="text-sm text-muted">
                      {[plan.neighborhood, plan.date].filter(Boolean).join(" · ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="border-y border-line bg-card">
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-5 py-14 sm:grid-cols-3 sm:px-8 lg:px-12">
          {STEPS.map((step) => (
            <div key={step.title} className="flex flex-col gap-2.5">
              <h2 className="m-0 font-serif text-[26px] font-medium">{step.title}</h2>
              <p className="m-0 leading-relaxed text-ink-soft">{step.text}</p>
            </div>
          ))}
        </div>
      </section>


      {top.length > 0 && (
        <section className="bg-ink text-paper">
          <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-end justify-between gap-10 px-5 py-16 sm:px-8 lg:px-12">
            <div className="flex flex-1 basis-[360px] flex-col gap-3">
              <p className="m-0 text-[13px] uppercase tracking-[0.14em] text-[#bdb5a6]">Top plans</p>
              <h2 className="m-0 font-serif text-[42px] leading-[1.1] font-medium">The plans people liked most</h2>
              <Link href="/plans" className="text-paper underline underline-offset-4 hover:text-white">
                See all plans →
              </Link>
            </div>
            <ol className="m-0 flex flex-1 basis-[420px] list-none flex-col gap-3.5 p-0 text-[17px]">
              {top.map((plan) => (
                <li key={plan.id} className="border-b border-ink-soft pb-3.5 last:border-b-0">
                  <Link href={`/plans/${plan.id}`} className="flex justify-between gap-4 text-paper hover:text-white hover:underline">
                    <span>
                      {plan.title}
                      {plan.neighborhood && <span className="text-[#bdb5a6]"> · {plan.neighborhood}</span>}
                    </span>
                    <span className="shrink-0 text-[#bdb5a6]">▲ {plan.score}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      <footer className="mx-auto flex w-full max-w-[1440px] flex-wrap items-baseline justify-between gap-4 px-5 py-5 text-sm text-muted sm:px-8 lg:px-12">
        <span>© {new Date().getFullYear()} OutNYC</span>
        <span>Place data from Google</span>
      </footer>
    </main>
  );
}
