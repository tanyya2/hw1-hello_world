import { createClient } from "@/utils/supabase/server";
import SignInButton from "./components/SignInButton";
import Explorer from "./explore/Explorer";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

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
      {/* Searching is for logged-in users only (also enforced on the server) */}
      {user ? (
        <Explorer intro={intro} />
      ) : (
        <>
          {intro}
          <div className="flex justify-center">
            <SignInButton />
          </div>
        </>
      )}
    </main>
  );
}
