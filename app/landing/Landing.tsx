import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { PlanContent } from "@/app/explore/plan";
import SignInButton from "@/app/components/SignInButton";
import RouteMap from "./RouteMap";

const KICKER = "m-0 text-[13px] uppercase tracking-[0.14em] text-muted";

const STEPS = [
  { title: "Where", text: "Use your location or pick a neighborhood, like Williamsburg or the West Village." },
  { title: "Your mood", text: "Quick lunch? Cheap date? Say no more, we’ve got you." },
  { title: "Your plan", text: "3–4 stops that are open, in an order you can walk, and what it will cost." },
];

// A hand-written example, so visitors see what a plan looks like before signing in
const EXAMPLE = [
  { name: "Hungarian Pastry Shop", note: "Coffee and a strudel in the back room · 45 min" },
  { name: "Cathedral of St. John the Divine", note: "Walk the nave and the garden · 40 min" },
  { name: "Morningside Park", note: "Down the steps to the pond · 25 min" },
  { name: "Book Culture", note: "Browse the new fiction table · 30 min" },
];

// The 3 plans with the most 👍 (no minimum yet: there aren't many users)
async function topPlans() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select("id, neighborhood, content, votes(value)")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? [])
    .map((row) => ({
      id: row.id,
      title: (JSON.parse(row.content) as PlanContent).title,
      neighborhood: row.neighborhood,
      up: row.votes.filter((vote) => vote.value === 1).length,
    }))
    .filter((plan) => plan.up > 0)
    .sort((a, b) => b.up - a.up)
    .slice(0, 3);
}

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
  const [top, mine] = await Promise.all([topPlans(), userId ? myPlans(userId) : []]);

  return (
    <main className="flex-1">
      <section className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-14 px-5 pt-14 pb-16 sm:px-8 lg:px-12 sm:pt-[72px]">
        <div className="flex min-w-0 flex-1 basis-[420px] flex-col gap-6">
          <h1 className="m-0 font-serif text-5xl leading-[1.02] font-medium tracking-[-0.02em] sm:text-[64px]">
            Your next few hours in New York, planned for you
          </h1>
          <p className="m-0 max-w-[480px] text-[19px] leading-relaxed text-ink-soft">
            Real places near you that are open now, in an order you can walk, with the route and what it will cost.
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
            <a href="#example" className="px-3 py-4 font-medium hover:text-accent">
              See an example →
            </a>
          </div>
        </div>
        <RouteMap />
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
                    href="/plans?view=mine"
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

      <section id="example" className="mx-auto flex w-full max-w-[1440px] scroll-mt-6 flex-wrap gap-14 px-5 py-[72px] sm:px-8 lg:px-12">
        <div className="flex min-w-0 flex-1 basis-[300px] flex-col gap-4">
          <p className={KICKER}>Example plan</p>
          <h2 className="m-0 font-serif text-[42px] leading-[1.1] font-medium">A slow afternoon in Morningside Heights</h2>
          <p className="m-0 leading-relaxed text-ink-soft">2 h 30 min · $$ · from Columbia’s main gate</p>
        </div>
        <ol className="m-0 flex min-w-0 flex-[2] basis-[480px] list-none flex-col p-0">
          {EXAMPLE.map((stop, i) => (
            <li key={stop.name} className="flex gap-5 border-t border-line py-5 last:border-b">
              <span className="w-7 font-serif text-[28px]">{i + 1}</span>
              <div className="flex flex-col gap-1">
                <strong className="text-lg font-semibold">{stop.name}</strong>
                <span className="text-[15px] text-ink-soft">{stop.note}</span>
              </div>
            </li>
          ))}
        </ol>
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
                <li key={plan.id} className="flex justify-between gap-4 border-b border-ink-soft pb-3.5 last:border-b-0">
                  <span>
                    {plan.title}
                    {plan.neighborhood && <span className="text-[#bdb5a6]"> · {plan.neighborhood}</span>}
                  </span>
                  <span className="shrink-0 text-[#bdb5a6]">▲ {plan.up}</span>
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
