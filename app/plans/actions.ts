"use server";

import { createClient } from "@/utils/supabase/server";
import { tally, type Tally } from "./votes";

export type VoteResult = Tally | { error: string };

// 👍 / 👎 a plan. Voting the same way again removes the vote; the other way changes it.
// RLS: users can only insert, update and delete their own votes.
export async function vote(planId: number, value: 1 | -1): Promise<VoteResult> {
  if (!Number.isInteger(planId) || (value !== 1 && value !== -1)) return { error: "Invalid vote." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { error: "Sign in to vote." };

  const { data: existing } = await supabase
    .from("votes")
    .select("value")
    .eq("plan_id", planId)
    .eq("user_id", userId)
    .maybeSingle();

  const { error } =
    existing?.value === value
      ? await supabase.from("votes").delete().eq("plan_id", planId).eq("user_id", userId)
      : await supabase
          .from("votes")
          .upsert({ user_id: userId, plan_id: planId, value }, { onConflict: "user_id,plan_id" });
  if (error) {
    console.error("vote:", error);
    return { error: "Couldn't save your vote. Try again." };
  }

  const { data: votes } = await supabase.from("votes").select("user_id, value").eq("plan_id", planId);
  return tally(votes ?? [], userId);
}
