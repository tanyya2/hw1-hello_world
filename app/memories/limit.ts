import type { createClient } from "@/utils/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// When the user last added a memory, or null
export async function lastMemoryAt(supabase: Supabase, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("memories")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.created_at ?? null;
}
