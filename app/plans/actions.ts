"use server";

import { createClient } from "@/utils/supabase/server";
import { tally, type Tally } from "./votes";

export type VoteResult = Tally | { error: string };

// What can be voted on, and where its votes are stored
const VOTES = {
  plan: { table: "votes", column: "plan_id" },
  memory: { table: "memory_votes", column: "memory_id" },
} as const;

export type VoteKind = keyof typeof VOTES;

// 👍 / 👎 a plan or memory. Voting the same way again removes the vote; the other way changes it.
// RLS: users can only insert, update and delete their own votes.
export async function vote(kind: VoteKind, id: number, value: 1 | -1): Promise<VoteResult> {
  if (!Object.hasOwn(VOTES, kind) || !Number.isInteger(id) || (value !== 1 && value !== -1)) {
    return { error: "Invalid vote." };
  }
  const { table, column } = VOTES[kind];

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { error: "Sign in to vote." };

  const { data: existing } = await supabase
    .from(table)
    .select("value")
    .eq(column, id)
    .eq("user_id", userId)
    .maybeSingle();

  const { error } =
    existing?.value === value
      ? await supabase.from(table).delete().eq(column, id).eq("user_id", userId)
      : await supabase
          .from(table)
          .upsert({ user_id: userId, [column]: id, value }, { onConflict: `user_id,${column}` });
  if (error) {
    console.error("vote:", error);
    return { error: "Couldn't save your vote. Try again." };
  }

  const { data: votes } = await supabase.from(table).select("user_id, value").eq(column, id);
  return tally(votes ?? [], userId);
}
