import type { createClient } from "@/utils/supabase/server";
import { MAX_IMAGE_COST } from "./openai";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// 1 memory per user per day (also enforced by RLS); deleted ones count too
export const MEMORY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
// Stop making memories once this month's images would cost more than this (OpenAI credit is $5)
export const MONTHLY_BUDGET = 4.5;

// Hours until the user can create another memory (0 = now)
export async function hoursUntilNextMemory(supabase: Supabase, userId: string): Promise<number> {
  const { data } = await supabase
    .from("memory_images")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return 0;
  const left = new Date(data.created_at).getTime() + MEMORY_COOLDOWN_MS - Date.now();
  return Math.max(0, Math.ceil(left / (60 * 60 * 1000)));
}

// Whether one more image could push this month's spending over the budget
export async function budgetReached(supabase: Supabase): Promise<boolean> {
  const { data, error } = await supabase.rpc("memory_images_spent_this_month");
  // If we can't tell, don't spend
  if (error) {
    console.error("budgetReached:", error);
    return true;
  }
  return Number(data) + MAX_IMAGE_COST > MONTHLY_BUDGET;
}
