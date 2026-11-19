import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { PlanContent } from "@/app/explore/plan";
import SignInButton from "@/app/components/SignInButton";
import { ArrowBadge, BUTTON } from "@/app/components/buttons";
import { parseContent, topPlans } from "@/app/plans/top";
import MapBackground from "./MapBackground";

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

// Home for everyone. Making a plan needs sign-in; looking around doesn't.
export default async function Landing({ userId }: { userId: string | null }) {
  const [best, mine] = await Promise.all([topPlans(3), userId ? myPlans(userId) : []]);
  const top = best.map(({ row, score }) => ({ id: row.id, title: parseContent(row).title, neighborhood: row.neighborhood, score }));

  return (
    <main className="relative isolate flex flex-1 flex-col">
      <MapBackground />

      {/* Everything fits on one screen on a laptop: hero on top, plan lists along the bottom */}
      <section className="mx-auto flex w-full max-w-[1440px] flex-col px-5 pt-10 sm:px-8 sm:pt-12 lg:px-12">
        <h1 className="wash m-0 self-start font-serif text-4xl leading-[1.05] font-medium tracking-[-0.02em] sm:text-[48px] xl:whitespace-nowrap">
          Your next few hours in New York planned for you
        </h1>
        <div className="wash wash-soft mt-7 flex max-w-[440px] flex-col gap-6 sm:mt-9">
          <p className="m-0 text-[17px] leading-relaxed text-ink-soft">
            Tell us where you are and what you&rsquo;re in the mood for. We&rsquo;ll find the spots, plan the walk, and
            keep it in your budget.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            {userId ? (
              <Link href="/plan" className={BUTTON.primary}>
                Make my plan
                <ArrowBadge />
              </Link>
            ) : (
              <SignInButton variant="primary" next="/plan">
                Make my plan
              </SignInButton>
            )}
            {/* Dotted underline, like the walking route */}
            <Link
              href="/plans"
              className="bg-[radial-gradient(circle,var(--color-accent)_1.2px,transparent_1.6px)] bg-[length:7px_4px] bg-bottom bg-repeat-x py-1 text-[15px] font-medium hover:text-accent"
            >
              Browse plans
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-auto grid w-full max-w-[1440px] gap-10 px-5 pt-12 sm:px-8 lg:grid-cols-2 lg:px-12">
        {mine.length > 0 && (
          <PlanList
            label="Your plans"
            link={{ href: "/plans?view=mine", text: "See all →" }}
            plans={mine.map((plan) => ({ id: plan.id, title: plan.title, place: plan.neighborhood, side: plan.date }))}
          />
        )}
        {top.length > 0 && (
          <PlanList
            label="Top plans"
            link={{ href: "/plans", text: "See all plans →" }}
            plans={top.map((plan) => ({ id: plan.id, title: plan.title, place: plan.neighborhood, side: `▲ ${plan.score}` }))}
            className="lg:col-start-2 lg:justify-self-end"
          />
        )}
      </div>

      <footer className="mx-auto flex w-full max-w-[1440px] flex-wrap items-baseline justify-between gap-4 px-5 py-5 text-[10.5px] text-muted opacity-75 sm:px-8 lg:px-12">
        <span>© {new Date().getFullYear()} OutNYC</span>
        <span>Map data © OpenStreetMap contributors</span>
      </footer>
    </main>
  );
}

type ListedPlan = { id: number; title: string; place: string | null; side: string };

type PlanListProps = { label: string; link: { href: string; text: string }; plans: ListedPlan[]; className?: string };

// A plain list with dividers, its label centered above and a link below
function PlanList({ label, link, plans, className = "" }: PlanListProps) {
  return (
    <section className={`wash wash-softer flex w-full max-w-[520px] flex-col gap-1.5 ${className}`}>
      <h2 className="m-0 text-center text-[12px] font-normal tracking-[0.14em] text-muted uppercase">{label}</h2>
      <ol className="m-0 list-none p-0 text-[15px]">
        {plans.map((plan) => (
          <li key={plan.id} className="border-b border-line last:border-b-0">
            <Link href={`/plans/${plan.id}`} className="flex justify-between gap-4 py-2.5 hover:text-accent">
              <span>
                {plan.title}
                {plan.place && <span className="text-muted"> · {plan.place}</span>}
              </span>
              <span className="shrink-0 text-muted">{plan.side}</span>
            </Link>
          </li>
        ))}
      </ol>
      <Link href={link.href} className="mt-3 self-end text-sm underline underline-offset-4 hover:text-accent">
        {link.text}
      </Link>
    </section>
  );
}
