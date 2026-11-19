import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ArrowBadge, BUTTON } from "@/app/components/buttons";
import { INPUT } from "@/app/components/fields";
import { saveName } from "./actions";

export const metadata: Metadata = { title: "Welcome" };

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
        <h1 className="m-0 text-center font-serif text-[32px] leading-tight font-medium">Please enter your first and last name.</h1>

        <label className="flex flex-col gap-1 text-sm">
          First name
          <input name="first_name" required defaultValue={profile?.first_name ?? ""} className={INPUT} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Last name
          <input name="last_name" required defaultValue={profile?.last_name ?? ""} className={INPUT} />
        </label>

        <button className={`${BUTTON.primary} self-center`}>
          Continue
          <ArrowBadge />
        </button>
      </form>
    </main>
  );
}
