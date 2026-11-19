import type { SupabaseClient } from "@supabase/supabase-js";

// Our own cap on Google Places requests: 30 per day (New York time) for the
// whole app, counted in Supabase by use_google_requests(). Google's own
// limits are a second layer; this one doesn't depend on their settings.
export const GOOGLE_LIMIT_ERROR = "We've used today's Google searches. Try again tomorrow.";

// "ok": reserved. "limit": that would go over today's cap.
// { error }: the cap couldn't be checked (a database error), so nothing was reserved.
export type Reservation = "ok" | "limit" | { error: string };

// Reserve `count` requests
export async function reserveGoogleRequests(supabase: SupabaseClient, count: number): Promise<Reservation> {
  const { data, error } = await supabase.rpc("use_google_requests", { n: count });
  if (error) {
    console.error("reserveGoogleRequests:", error);
    return { error: error.message };
  }
  return data === true ? "ok" : "limit";
}
