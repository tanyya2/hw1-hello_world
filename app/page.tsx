import { createClient } from "@/utils/supabase/server";
import Landing from "./landing/Landing";

// The landing page is home for everyone; signed-in users also see their latest plans
export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return <Landing userId={data?.claims?.sub ?? null} />;
}
