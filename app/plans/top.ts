import { createClient } from "@/utils/supabase/server";
import type { PlanContent } from "@/app/explore/plan";

// What the plans list and cards need from each row
export const PLAN_FIELDS =
  "id, created_at, neighborhood, inputs, content, profiles(first_name, last_name), votes(user_id, value)";

export type PlanRow = {
  id: number;
  created_at: string;
  neighborhood: string | null;
  inputs: { budget?: string } | null;
  content: string;
  profiles: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] | null;
  votes: { user_id: string; value: number }[];
};

export function parseContent(row: PlanRow): PlanContent {
  return JSON.parse(row.content);
}

// "Sam K." — one author per plan; the untyped client types the join as a list
export function authorOf(row: PlanRow) {
  const profile = [row.profiles].flat()[0];
  return profile ? `${profile.first_name ?? ""} ${profile.last_name?.[0] ?? ""}`.trim() || null : null;
}

// All-time top plans by score (👍 minus 👎), at least 1 point.
// Ties go to the newer plan.
export async function topPlans(count: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select(PLAN_FIELDS)
    .order("created_at", { ascending: false })
    .limit(500);
  return ((data ?? []) as PlanRow[])
    .map((row) => ({ row, score: row.votes.reduce((total, vote) => total + vote.value, 0) }))
    .filter((plan) => plan.score >= 1)
    // Rows come newest first and the sort is stable, so ties stay newest first
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}
