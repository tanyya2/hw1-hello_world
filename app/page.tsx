import { createClient } from "@/utils/supabase/server";
import Explorer from "./explore/Explorer";
import Landing from "./landing/Landing";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // Logged-out visitors get the landing page; searching needs login (also enforced on the server)
  if (!user) return <Landing />;

  const intro = (
    <div className="flex flex-col gap-3">
      <h1 className="text-3xl font-semibold tracking-tight">What&apos;s around me in NYC?</h1>
      <p className="text-zinc-500 dark:text-zinc-400">
        Find places near you and get a plan
      </p>
    </div>
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-10 px-4 py-12 text-center">
      <Explorer intro={intro} />
    </main>
  );
}
