import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import PlanMaker from "./PlanMaker";

export const metadata: Metadata = { title: "Make a plan" };

// Making a plan needs sign-in (also enforced in generatePlan)
export default async function MakePlan() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/");

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:px-8 sm:py-10">
      <PlanMaker />
    </main>
  );
}
