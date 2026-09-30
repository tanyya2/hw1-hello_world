import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { saveName } from "./actions";

export const metadata: Metadata = { title: "Welcome" };

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

export default async function Welcome() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.sub)
    .single();

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <form action={saveName} className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-center text-lg font-medium">Please enter your first and last name.</h1>

        <label className="flex flex-col gap-1 text-sm">
          First name
          <input name="first_name" required defaultValue={profile?.first_name ?? ""} className={inputClass} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Last name
          <input name="last_name" required defaultValue={profile?.last_name ?? ""} className={inputClass} />
        </label>

        <button className="rounded-full bg-black px-4 py-2 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
          Continue
        </button>
      </form>
    </main>
  );
}
